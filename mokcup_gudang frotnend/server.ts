import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const DB_FILE = path.join(process.cwd(), "server-db.json");

// Helper to read database
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      if (!db.photos) {
        db.photos = [];
      }
      if (!db.documents || db.documents.length === 0) {
        db.documents = [];
        // Seed documents based on existing orders
        if (db.orders && db.orders.length > 0) {
          db.orders.forEach((order: any, idx: number) => {
            const docSeq = String(idx + 1).padStart(3, "0");
            const docId = `DOC-${docSeq}`;
            const cleanOrderId = order.id.replace("AGP-ORD-2026-", "").replace("AGP-ORD-", "").replace("ORD-", "");
            const docNumber = `FPPB/AP/2026/${cleanOrderId}`;
            const relativePath = `/storage/documents/FPPB_${order.id}_seeded.pdf`;
            
            const savedItems = order.items && order.items.length > 0 ? order.items.map((it: any) => {
              const basePrice: Record<string, number> = { "Wortel": 15000, "Buncis": 18000, "Jagung Manis": 22000, "Sayuran Mix": 20000 };
              const harga = (basePrice[it.commodity] || 15000) * parseFloat(it.packageWeight);
              return {
                ...it,
                packageWeight: parseFloat(it.packageWeight),
                quantity: parseInt(it.quantity),
                totalWeight: parseFloat(it.packageWeight) * parseInt(it.quantity),
                harga: harga,
                totalPrice: parseInt(it.quantity) * harga
              };
            }) : [{
              commodity: order.commodity,
              packaging: order.packaging || "1 Kg",
              packageWeight: parseFloat(order.packageWeight) || 1.0,
              quantity: parseInt(order.quantity) || 100,
              totalWeight: order.totalWeight || 100,
              harga: ((order.commodity === "Buncis" ? 18005 : order.commodity === "Jagung Manis" ? 22000 : order.commodity === "Sayuran Mix" ? 20000 : 15000) * (parseFloat(order.packageWeight) || 1.0)),
              totalPrice: (parseInt(order.quantity) || 100) * ((order.commodity === "Buncis" ? 18000 : order.commodity === "Jagung Manis" ? 22000 : order.commodity === "Sayuran Mix" ? 20000 : 15000) * (parseFloat(order.packageWeight) || 1.0))
            }];

            const totalQty = savedItems.reduce((sum: number, it: any) => sum + it.quantity, 0);
            const subTotal = savedItems.reduce((sum: number, it: any) => sum + it.totalPrice, 0);

            db.documents.push({
              id: docId,
              docNumber,
              orderId: order.id,
              pdfPath: relativePath,
              generateDate: order.createdAt || new Date().toISOString(),
              generatedBy: "admin",
              generatedByRole: "Admin Gudang",
              status: order.status === "Menunggu Konfirmasi" ? "Draft" : order.status === "Diproses" ? "Diproses" : "Selesai",
              notes: "Mohon dikirimkan dalam kondisi beku menggunakan cold storage logistik.",
              items: savedItems,
              totalQty,
              subTotal,
              grandTotal: subTotal,
              divisi: "SBU Bandung - Divisi Logistics & Food Retail",
              alamat: "Jl. Kinanti No. 26 Kota Bandung",
              tanggalDiterima: order.deliveryDate || order.orderDate
            });
          });
        }
      }
      return db;
    }
  } catch (error) {
    console.error("Error reading database:", error);
  }
  return {
    users: [],
    orders: [],
    procurements: [],
    deliveries: [],
    qcChecklists: [],
    productions: [],
    hppRecords: [],
    auditLogs: [],
    notifications: [],
    photos: [],
    documents: []
  };
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// SHA-256 Hash Function
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Ensure folder exists and save safe base64-decoded image
function saveBase64Image(base64Data: string, subfolder: "penerimaan" | "qc", filename: string): string {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let buffer: Buffer;
  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], "base64");
  } else {
    buffer = Buffer.from(base64Data, "base64");
  }
  
  const publicDir = path.join(process.cwd(), "public");
  const storageDir = path.join(publicDir, "storage", subfolder);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  const filePath = path.join(storageDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/storage/${subfolder}/${filename}`;
}

// Validate that camera capture is directly from camera and not fake/galery upload
function validateUploadedPhoto(photoUrl: string, photoMetadata: any) {
  if (!photoUrl) {
    throw new Error("Wajib mengambil foto bukti fisik barang!");
  }
  
  // 1. Validasi format gambar
  const isBase64 = photoUrl.startsWith("data:image/");
  if (!isBase64 && !photoUrl.startsWith("http") && !photoUrl.startsWith("/storage/")) {
    throw new Error("Format gambar tidak valid. Hanya menerima stream raw image dari kamera.");
  }
  
  // 2. Cegah upload file galeri biasa dengan mewajibkan ada metadata geolokasi & device
  if (!photoMetadata || !photoMetadata.deviceInfo || !photoMetadata.geolocation) {
    throw new Error("Aktivasi kamera gagal atau manipulasi terdeteksi! Data foto harus diambil via Live Device GPS Camera.");
  }

  // 3. Validasi timestamp
  if (photoMetadata.timestamp) {
    const photoTime = new Date(photoMetadata.timestamp).getTime();
    const serverTime = Date.now();
    // Allow up to 15 minutes of timezone/network divergence
    const diffMin = Math.abs(serverTime - photoTime) / (1000 * 60);
    if (diffMin > 15) {
      throw new Error(`Validasi Gagal: Timestamp foto (${diffMin.toFixed(1)} menit selisih) terdeteksi manipulasi atau usang.`);
    }
  }
}

// Validate and register photo in relational DB
function validateAndSavePhoto(
  db: any,
  photoUrl: string,
  photoMetadata: any,
  moduleName: "Penerimaan" | "QC",
  transactionId: string,
  username: string,
  role: string,
  farmerName: string = "",
  commodity: string = "",
  caption: string = ""
): string {
  if (!photoUrl) return "";

  // If already saved on disk, do not write again but make sure relation is there
  if (photoUrl.startsWith("/storage/")) {
    const exists = db.photos?.some((ph: any) => ph.filepath === photoUrl && ph.transactionId === transactionId);
    if (!exists) {
      const photoId = `IMG-${String((db.photos?.length || 0) + 1).padStart(3, "0")}`;
      db.photos = db.photos || [];
      db.photos.push({
        id: photoId,
        filename: path.basename(photoUrl),
        filepath: photoUrl,
        timestamp: photoMetadata?.timestamp || new Date().toISOString(),
        username,
        role,
        module: moduleName,
        transactionId,
        deviceInfo: photoMetadata?.deviceInfo || "Device Unknown",
        geolocation: photoMetadata?.geolocation || "Unknown location",
        farmerName,
        commodity,
        caption: caption || `Dokumentasi ${moduleName} ${transactionId}`
      });
    }
    return photoUrl;
  }

  // 1. Validasi
  validateUploadedPhoto(photoUrl, photoMetadata);

  // 2. Tentukan subfolder, nama file, dan simpan
  const subfolder = moduleName === "Penerimaan" ? "penerimaan" : "qc";
  const timestamp = Date.now();
  const fileExt = photoUrl.includes("image/png") ? "png" : "jpg";
  const filename = `${subfolder}_${transactionId}_${timestamp}.${fileExt}`;
  
  const savedPath = saveBase64Image(photoUrl, subfolder, filename);

  // 3. Tambahkan ke array relasi foto (one-to-many)
  const photoId = `IMG-${String((db.photos?.length || 0) + 1).padStart(3, "0")}`;
  db.photos = db.photos || [];
  db.photos.push({
    id: photoId,
    filename,
    filepath: savedPath,
    timestamp: photoMetadata?.timestamp || new Date().toISOString(),
    username,
    role,
    module: moduleName,
    transactionId,
    deviceInfo: photoMetadata?.deviceInfo || "Device Unknown",
    geolocation: photoMetadata?.geolocation || "Unknown location",
    farmerName,
    commodity,
    caption: caption || `Dokumentasi ${moduleName} ${transactionId}`
  });

  return savedPath;
}

// Log activities
function logActivity(username: string, role: string, action: string, details: string, ip: string) {
  const db = readDB();
  const newLog = {
    id: `L${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    username,
    role,
    action,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: ip || "127.0.0.1"
  };
  db.auditLogs.unshift(newLog); // newer first
  writeDB(db);
}

// Trigger in-system notifications
function triggerNotification(title: string, message: string, type: 'info' | 'success' | 'warn' | 'error') {
  const db = readDB();
  const newNotif = {
    id: `N${Date.now()}`,
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.unshift(newNotif);
  writeDB(db);
  return newNotif;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: "50mb" })); // allows high-res base64 photo capture
  app.use("/storage", express.static(path.join(process.cwd(), "public/storage")));

  // -------------------------------------------------------------
  // API ROUTES (Must go BEFORE Vite middlewares)
  // -------------------------------------------------------------

  // Core Audit Logs
  app.get("/api/audit-logs", (req, res) => {
    const db = readDB();
    res.json(db.auditLogs);
  });

  // Authentication
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username dan password wajib diisi." });
    }

    const db = readDB();
    const user = db.users.find((u: any) => u.username === username);
    if (!user) {
      return res.status(401).json({ message: "Username tidak terdaftar." });
    }

    const hash = hashPassword(password);
    if (user.passwordHash !== hash) {
      return res.status(401).json({ message: "Password salah." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    logActivity(user.username, user.role, "LOGIN", "Berhasil login ke sistem.", req.ip || "127.0.0.1");

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      token: token
    });
  });

  // Orders (SBU Bandung Demands)
  app.get("/api/orders", (req, res) => {
    const db = readDB();
    res.json(db.orders || []);
  });

  app.post("/api/orders", (req, res) => {
    const { commodity, packaging, packageWeight, quantity, items, operator, deliveryDate } = req.body;
    const db = readDB();

    const currentYear = new Date().getFullYear();
    const validYear = currentYear >= 2026 ? currentYear : 2026;
    let maxSeq = 0;
    (db.orders || []).forEach((o: any) => {
      if (o.id && o.id.startsWith(`AGP-ORD-${validYear}-`)) {
        const parts = o.id.split("-");
        const seqNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
    const orderNo = `AGP-ORD-${validYear}-${String(maxSeq + 1).padStart(3, "0")}`;
    
    let savedItems = [];
    let primaryCommodity = "";
    let primaryPackaging = "";
    let primaryPackageWeight = 1;
    let primaryQuantity = 0;
    let totalWeight = 0;

    if (items && Array.isArray(items) && items.length > 0) {
      savedItems = items.map(item => {
        const itemPkgWeight = parseFloat(item.packageWeight || item.berat_kemasan);
        const itemQty = parseInt(item.quantity || item.qty_pack);
        const itemTotalW = itemPkgWeight * itemQty;
        const itemComm = item.commodity || item.nama_komoditas;
        return {
          commodity: itemComm,
          packaging: item.packaging || `${itemPkgWeight} Kg`,
          packageWeight: itemPkgWeight,
          quantity: itemQty,
          totalWeight: itemTotalW,
          // Indonesian aliases
          nama_komoditas: itemComm,
          qty_pack: itemQty,
          berat_kemasan: itemPkgWeight,
          total_berat: itemTotalW
        };
      });
      primaryCommodity = savedItems.map(si => si.commodity).filter((v, i, a) => a.indexOf(v) === i).join(", ");
      primaryPackaging = savedItems[0].packaging;
      primaryPackageWeight = parseFloat(savedItems[0].packageWeight);
      primaryQuantity = savedItems.reduce((sum, item) => sum + item.quantity, 0);
      totalWeight = savedItems.reduce((sum, item) => sum + item.totalWeight, 0);
    } else {
      const singleWeight = parseFloat(packageWeight) * parseInt(quantity);
      savedItems = [{
        commodity,
        packaging,
        packageWeight: parseFloat(packageWeight),
        quantity: parseInt(quantity),
        totalWeight: singleWeight,
        // Indonesian aliases
        nama_komoditas: commodity,
        qty_pack: parseInt(quantity),
        berat_kemasan: parseFloat(packageWeight),
        total_berat: singleWeight
      }];
      primaryCommodity = commodity;
      primaryPackaging = packaging;
      primaryPackageWeight = parseFloat(packageWeight);
      primaryQuantity = parseInt(quantity);
      totalWeight = singleWeight;
    }

    const oDate = new Date().toISOString().split("T")[0];
    const dDate = deliveryDate || new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0];
    const cust = req.body.customer || "SBU Bandung (Internal)";

    const newOrder = {
      id: orderNo,
      orderDate: oDate,
      deliveryDate: dDate,
      commodity: primaryCommodity,
      packaging: primaryPackaging,
      packageWeight: primaryPackageWeight,
      quantity: primaryQuantity,
      totalWeight,
      items: savedItems,
      status: "Menunggu Konfirmasi",
      createdAt: new Date().toISOString(),
      customer: cust,
      source: req.body.source || "B2B SBU",

      // Indonesian aliases
      id_order: orderNo,
      tanggal_order: oDate,
      tanggal_pengiriman: dDate,
      status_order: "Menunggu Konfirmasi", // additional help
      items_indo: savedItems // additional help
    };

    db.orders = db.orders || [];
    db.orders.push(newOrder);

    // Auto-generate official Form Permohonan Permintaan Barang Gudang document
    let autoDoc;
    try {
      autoDoc = generatePDFDocumentRecord(
        db,
        newOrder,
        operator?.username || "SBU-Bandung",
        operator?.role || "SBU Bandung",
        "Mohon dikirimkan dalam kondisi beku suhu -18°C menggunakan kontainer berpendingin."
      );
    } catch (dErr) {
      console.error("Failed to auto-generate document on order placement:", dErr);
    }

    writeDB(db);

    triggerNotification(
      "Order Baru dari SBU Bandung",
      `Permintaan produk beku ${primaryCommodity} sebanyak ${primaryQuantity} pack (${totalWeight.toFixed(2)} kg) diterima. Dokumen FPPB otomatis di-generate.`,
      "info"
    );

    logActivity(
      operator?.username || "SBU-Bandung",
      operator?.role || "SBU Bandung",
      "BUAT_ORDER",
      `Membuat order baru ${orderNo}: ${primaryCommodity} (${totalWeight.toFixed(2)} Kg) & auto-generate FPPB`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json({
      ...newOrder,
      documentId: autoDoc ? autoDoc.id : null,
      docNumber: autoDoc ? autoDoc.docNumber : null
    });
  });

  app.put("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { status, operator } = req.body;
    const db = readDB();

    const index = db.orders.findIndex((o: any) => o.id === id);
    if (index === -1) return res.status(404).json({ message: "Order tidak ditemukan" });

    db.orders[index].status = status;
    db.orders[index].status_order = status; // Indonesian alias
    writeDB(db);

    if (status === "Selesai") {
      triggerNotification(
        "Produksi Order Selesai",
        `Order ${id} untuk komoditas ${db.orders[index].commodity} siap kirim.`,
        "success"
      );
    }

    logActivity(
      operator?.username || "system",
      operator?.role || "System",
      "UPDATE_ORDER_STATUS",
      `Mengubah status order ${id} menjadi ${status}`,
      req.ip || "127.0.0.1"
    );

    res.json(db.orders[index]);
  });

  // Procurements / Pengajuan ke Kepala Tani
  app.get("/api/procurements", (req, res) => {
    const db = readDB();
    res.json(db.procurements || []);
  });

  app.post("/api/procurements", (req, res) => {
    const { commodity, neededWeight, estimatedShrinkage, rawMaterialToOrder, marketPricePerKg, expectedDeliveryDate, notes, items, operator, orderId } = req.body;
    const db = readDB();

    const procNo = `REQ-${String((db.procurements?.length || 0) + 1).padStart(3, "0")}`;
    
    const savedItems = items || [];
    const totalPrice = savedItems.length > 0 
      ? savedItems.reduce((acc: number, it: any) => acc + (parseFloat(it.totalPrice) || 0), 0)
      : parseFloat(rawMaterialToOrder) * parseFloat(marketPricePerKg);

    const calcCommodity = savedItems.length > 0 
      ? Array.from(new Set(savedItems.map((it: any) => it.commodity))).join(", ")
      : commodity;

    const calcToOrder = savedItems.length > 0 
      ? savedItems.reduce((acc: number, it: any) => acc + (parseFloat(it.totalWeight) || 0), 0)
      : parseFloat(rawMaterialToOrder);

    const calcNeeded = savedItems.length > 0
      ? savedItems.reduce((acc: number, it: any) => acc + (parseFloat(it.neededWeight) || parseFloat(it.totalWeight) || 0), 0)
      : parseFloat(neededWeight);

    const newProc = {
      id: procNo,
      orderId: orderId || (items && items[0]?.orderId) || "",
      commodity: calcCommodity,
      neededWeight: calcNeeded,
      estimatedShrinkage: parseFloat(estimatedShrinkage) || 0,
      rawMaterialToOrder: calcToOrder,
      marketPricePerKg: savedItems.length > 0 ? (savedItems[0].marketPricePerKg || 0) : parseFloat(marketPricePerKg),
      totalPrice,
      expectedDeliveryDate,
      notes,
      items: savedItems,
      status: "Menunggu" as const,
      createdAt: new Date().toISOString()
    };

    db.procurements = db.procurements || [];
    db.procurements.push(newProc);
    writeDB(db);

    triggerNotification(
      "Pengajuan Bahan Baku Baru",
      `Diajukan pengadaan ${calcCommodity} sebanyak ${calcToOrder} kg ke Kepala Tani.`,
      "info"
    );

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "BUAT_PENGAJUAN_TANI",
      `Mengajukan bahan baku ${procNo}: ${calcCommodity} (${calcToOrder} kg) senilai Rp ${totalPrice.toLocaleString()}`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json(newProc);
  });

  app.put("/api/procurements/:id", (req, res) => {
    const { id } = req.params;
    const { status, commodity, rawMaterialToOrder, marketPricePerKg, expectedDeliveryDate, notes, items, operator, orderId } = req.body;
    const db = readDB();

    const idx = db.procurements.findIndex((p: any) => p.id === id);
    if (idx === -1) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });

    if (status !== undefined) {
      db.procurements[idx].status = status;
    }

    if (orderId !== undefined) {
      db.procurements[idx].orderId = orderId;
    }
    
    if (items !== undefined) {
      db.procurements[idx].items = items;
      const savedItems = items || [];
      if (savedItems.length > 0) {
        db.procurements[idx].totalPrice = savedItems.reduce((acc: number, it: any) => acc + (parseFloat(it.totalPrice) || 0), 0);
        db.procurements[idx].commodity = Array.from(new Set(savedItems.map((it: any) => it.commodity))).join(", ");
        db.procurements[idx].rawMaterialToOrder = savedItems.reduce((acc: number, it: any) => acc + (parseFloat(it.totalWeight) || 0), 0);
        db.procurements[idx].neededWeight = savedItems.reduce((acc: number, it: any) => acc + (parseFloat(it.neededWeight) || parseFloat(it.totalWeight) || 0), 0);
        db.procurements[idx].marketPricePerKg = savedItems[0].marketPricePerKg || 0;
      }
    } else {
      if (commodity !== undefined) {
        db.procurements[idx].commodity = commodity;
      }
      if (rawMaterialToOrder !== undefined) {
        db.procurements[idx].rawMaterialToOrder = parseInt(rawMaterialToOrder);
        db.procurements[idx].neededWeight = parseFloat(rawMaterialToOrder);
        const price = marketPricePerKg !== undefined ? parseInt(marketPricePerKg) : db.procurements[idx].marketPricePerKg;
        db.procurements[idx].totalPrice = parseInt(rawMaterialToOrder) * price;
      }
      if (marketPricePerKg !== undefined) {
        db.procurements[idx].marketPricePerKg = parseInt(marketPricePerKg);
        const qty = rawMaterialToOrder !== undefined ? parseInt(rawMaterialToOrder) : db.procurements[idx].rawMaterialToOrder;
        db.procurements[idx].totalPrice = qty * parseInt(marketPricePerKg);
      }
    }

    if (expectedDeliveryDate !== undefined) {
      db.procurements[idx].expectedDeliveryDate = expectedDeliveryDate;
    }
    if (notes !== undefined) {
      db.procurements[idx].notes = notes;
    }

    writeDB(db);

    triggerNotification(
      "Pengajuan Diperbarui",
      `Pengajuan bahan baku ${id} berhasil diperbarui. Status: ${db.procurements[idx].status}`,
      "success"
    );

    logActivity(
      operator?.username || "system",
      operator?.role || "System",
      "UPDATE_PENGAJUAN",
      `Melakukan update rincian pengajuan ${id}: ${db.procurements[idx].commodity} - ${db.procurements[idx].rawMaterialToOrder} kg`,
      req.ip || "127.0.0.1"
    );

    res.json(db.procurements[idx]);
  });

  app.delete("/api/procurements/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();

    const idx = db.procurements.findIndex((p: any) => p.id === id);
    if (idx === -1) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });

    const deleted = db.procurements.splice(idx, 1)[0];
    writeDB(db);

    triggerNotification(
      "Pengajuan Dihapus",
      `Kontrak PO bahan baku ${id} telah dihapus dari sistem.`,
      "warn"
    );

    logActivity(
      req.headers["x-operator-username"] as string || "system",
      req.headers["x-operator-role"] as string || "System",
      "DELETE_PENGAJUAN",
      `Menghapus pengajuan ${id} (${deleted.commodity} - ${deleted.rawMaterialToOrder} kg)`,
      req.ip || "127.0.0.1"
    );

    res.json({ message: "Pengajuan PO berhasil dihapus", id });
  });

  // Farmer Deliveries / Penerimaan Bahan Baku
  app.get("/api/deliveries", (req, res) => {
    const db = readDB();
    res.json(db.deliveries || []);
  });

  app.post("/api/deliveries", (req, res) => {
    const { procurementId, farmerName, commodity, sentWeight, shippingDate, photoUrl, photoMetadata, operator, orderId } = req.body;
    const db = readDB();

    const currentYear = new Date().getFullYear();
    const validYear = currentYear >= 2026 ? currentYear : 2026;
    let maxDelivSeq = 0;
    (db.deliveries || []).forEach((d: any) => {
      if (d.id && d.id.startsWith(`AGP-RCV-${validYear}-`)) {
        const parts = d.id.split("-");
        const seqNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(seqNum) && seqNum > maxDelivSeq) {
          maxDelivSeq = seqNum;
        }
      }
    });
    const delivId = `AGP-RCV-${validYear}-${String(maxDelivSeq + 1).padStart(3, "0")}`;

    // Validate and save camera photo physical file on disk + register in photos table
    let savedPhotoUrl = "";
    try {
      savedPhotoUrl = validateAndSavePhoto(
        db,
        photoUrl,
        photoMetadata,
        "Penerimaan",
        delivId,
        operator?.username || "admin",
        operator?.role || "Admin Gudang",
        farmerName,
        commodity,
        `Foto Penerimaan ${delivId} - ${commodity}`
      );
    } catch (err: any) {
      console.error("Camera validation error in deliveries post:", err);
      return res.status(400).json({ message: err.message });
    }

    const matchedProc = procurementId ? db.procurements.find((p: any) => p.id === procurementId) : null;
    const resolvedOrderId = orderId || (matchedProc ? matchedProc.orderId : "");

    const newDelivery = {
      id: delivId,
      procurementId,
      orderId: resolvedOrderId,
      id_order: resolvedOrderId, // Indonesian alias
      farmerName,
      commodity,
      sentWeight: parseFloat(sentWeight),
      shippingDate,
      photoUrl: savedPhotoUrl,
      photoMetadata: photoMetadata || {
        timestamp: new Date().toISOString(),
        deviceInfo: "Chrome Embedded (V8 Standard Device)",
        geolocation: "Bandung, Indonesia"
      },
      status: "Menunggu Validasi" as const,
      createdAt: new Date().toISOString()
    };

    db.deliveries = db.deliveries || [];
    db.deliveries.push(newDelivery);

    // Auto-update matching procurement status to 'Dikirim'
    if (procurementId) {
      const pIdx = db.procurements.findIndex((p: any) => p.id === procurementId);
      if (pIdx !== -1) {
        db.procurements[pIdx].status = "Dikirim";
      }
    }

    writeDB(db);

    triggerNotification(
      "Penerimaan Bahan Baku Datang",
      `Bahan baku ${commodity} (${sentWeight} kg) dari ${farmerName} tiba di gudang.`,
      "info"
    );

    logActivity(
      operator?.username || "petani-gateway",
      operator?.role || "Sistem Petani",
      "TERIMA_BAHAN_BAKU",
      `Menerima kiriman ${delivId} dari ${farmerName} sebanyak ${sentWeight} Kg`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json(newDelivery);
  });

  // Base edit and delete for Deliveries (Audit Penerimaan & Geotag Petani) - REVISI 5
  app.put("/api/deliveries/:id", (req, res) => {
    const { id } = req.params;
    const { farmerName, sentWeight, commodity, status, operator } = req.body;
    const db = readDB();

    const idx = db.deliveries.findIndex((d: any) => d.id === id);
    if (idx === -1) return res.status(404).json({ message: "Penerimaan tidak ditemukan" });

    if (farmerName !== undefined) db.deliveries[idx].farmerName = farmerName;
    if (sentWeight !== undefined) db.deliveries[idx].sentWeight = parseFloat(sentWeight);
    if (commodity !== undefined) db.deliveries[idx].commodity = commodity;
    if (status !== undefined) db.deliveries[idx].status = status;
    if (req.body.photoUrl !== undefined) db.deliveries[idx].photoUrl = req.body.photoUrl;
    if (req.body.photoMetadata !== undefined) db.deliveries[idx].photoMetadata = req.body.photoMetadata;

    writeDB(db);

    logActivity(
      operator?.username || "system",
      operator?.role || "System",
      "UPDATE_DELIVERY",
      `Mengubah data penerimaan ${id} dari ${db.deliveries[idx].farmerName}`,
      req.ip || "127.0.0.1"
    );

    res.json(db.deliveries[idx]);
  });

  app.delete("/api/deliveries/:id/photo", (req, res) => {
    const { id } = req.params;
    const { operator } = req.body || {};
    const db = readDB();

    const idx = db.deliveries.findIndex((d: any) => d.id.trim().toUpperCase() === id.trim().toUpperCase());
    if (idx === -1) return res.status(404).json({ message: "Penerimaan tidak ditemukan" });

    // Clean up physical file if it exists on disk
    const oldPhotoUrl = db.deliveries[idx].photoUrl;
    if (oldPhotoUrl && !oldPhotoUrl.startsWith("data:") && !oldPhotoUrl.startsWith("http")) {
      const pathsToTry = [
        path.join(process.cwd(), oldPhotoUrl),
        path.join(process.cwd(), "public", oldPhotoUrl),
        oldPhotoUrl.startsWith("/") ? path.join(process.cwd(), oldPhotoUrl.slice(1)) : path.join(process.cwd(), oldPhotoUrl)
      ];
      for (const p of pathsToTry) {
        try {
          if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
            fs.unlinkSync(p);
            console.log(`Physically deleted delivery photo file at: ${p}`);
            break;
          }
        } catch (err) {
          console.error("Failed to delete physical delivery photo file:", err);
        }
      }
    }

    db.deliveries[idx].photoUrl = "";
    db.deliveries[idx].photoMetadata = null;
    writeDB(db);

    logActivity(
      operator?.username || "system",
      operator?.role || "System",
      "DELETE_DELIVERY_PHOTO",
      `Menghapus dokumentasi foto dari penerimaan ${id}`,
      req.ip || "127.0.0.1"
    );

    res.json(db.deliveries[idx]);
  });

  app.delete("/api/deliveries/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();

    const idx = db.deliveries.findIndex((d: any) => d.id.trim().toUpperCase() === id.trim().toUpperCase());
    if (idx === -1) return res.status(404).json({ message: "Penerimaan tidak ditemukan" });

    const deleted = db.deliveries.splice(idx, 1)[0];

    // Clean up physical file for the deleted record if it exists on disk
    const oldPhotoUrl = deleted.photoUrl;
    if (oldPhotoUrl && !oldPhotoUrl.startsWith("data:") && !oldPhotoUrl.startsWith("http")) {
      const pathsToTry = [
        path.join(process.cwd(), oldPhotoUrl),
        path.join(process.cwd(), "public", oldPhotoUrl),
        oldPhotoUrl.startsWith("/") ? path.join(process.cwd(), oldPhotoUrl.slice(1)) : path.join(process.cwd(), oldPhotoUrl)
      ];
      for (const p of pathsToTry) {
        try {
          if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
            fs.unlinkSync(p);
            console.log(`Physically deleted delivery photo file of deleted record at: ${p}`);
            break;
          }
        } catch (err) {
          console.error("Failed to delete physical delivery photo file of deleted record:", err);
        }
      }
    }

    writeDB(db);

    logActivity(
      "system",
      "System",
      "DELETE_DELIVERY",
      `Menghapus penerimaan hulu ${id} dari ${deleted.farmerName}`,
      req.ip || "127.0.0.1"
    );

    res.json({ message: "Penerimaan hulu berhasil dihapus", id });
  });

  // Weight validation (Timbang ulang)
  app.put("/api/deliveries/:id/scale", (req, res) => {
    const { id } = req.params;
    const { scaledWeightWarehouse, scaleNotes, operator } = req.body;
    const db = readDB();

    const idx = db.deliveries.findIndex((d: any) => d.id === id);
    if (idx === -1) return res.status(404).json({ message: "Penerimaan tidak ditemukan" });

    const sent = parseFloat(db.deliveries[idx].sentWeight);
    const scaled = parseFloat(scaledWeightWarehouse);
    const diff = scaled - sent;

    let scaleStatus: 'Sesuai' | 'Kelebihan' | 'Kekurangan' = 'Sesuai';
    if (diff > 0) {
      scaleStatus = 'Kelebihan';
    } else if (diff < 0) {
      scaleStatus = 'Kekurangan';
    }

    db.deliveries[idx].scaledWeightWarehouse = scaled;
    db.deliveries[idx].scaleStatus = scaleStatus;
    db.deliveries[idx].scaleDifference = diff;
    db.deliveries[idx].scaleNotes = scaleNotes;
    db.deliveries[idx].status = "Diterima";

    // Auto update matching procurement as well if scale is accepted
    const pId = db.deliveries[idx].procurementId;
    if (pId) {
      const pIdx = db.procurements.findIndex((p: any) => p.id === pId);
      if (pIdx !== -1) {
        db.procurements[pIdx].status = "Selesai";
      }
    }

    writeDB(db);

    if (scaleStatus === 'Kekurangan') {
      triggerNotification(
        "Timbang Ulang: Kekurangan Bahan Baku!",
        `Kekurangan berat ${Math.abs(diff)} kg pada ${db.deliveries[idx].commodity} (${id}) dari ${db.deliveries[idx].farmerName}. Notifikasi terkirim ke Kepala Tani.`,
        "warn"
      );
    } else if (scaleStatus === 'Kelebihan') {
      triggerNotification(
        "Timbang Ulang: Kelebihan Bahan Baku!",
        `Kelebihan berat +${diff} kg pada ${db.deliveries[idx].commodity} (${id}) dari ${db.deliveries[idx].farmerName}. Ajukan pengembalian ke petani.`,
        "warn"
      );
    } else {
      triggerNotification(
        "Penerimaan Bahan Baku Tervalidasi",
        `Penerimaan ${id} tervalidasi Sesuai (${scaled} kg). Siap melaju ke pengecekan QC.`,
        "success"
      );
    }

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "TIMBANG_ULANG",
      `Validasi timbang ulang harian ${id}. Timbangan: ${scaled} Kg (Kirim: ${sent} Kg, Selisih: ${diff} Kg) -> ${scaleStatus}`,
      req.ip || "127.0.0.1"
    );

    res.json(db.deliveries[idx]);
  });

  // Action to resolve shortfall / edit scaled validation to complete
  app.put("/api/deliveries/:id/resolve", (req, res) => {
    const { id } = req.params;
    const { resolvedWeight, operator } = req.body;
    const db = readDB();

    const idx = db.deliveries.findIndex((d: any) => d.id === id);
    if (idx === -1) return res.status(404).json({ message: "Penerimaan tidak ditemukan" });

    db.deliveries[idx].scaledWeightWarehouse = parseFloat(resolvedWeight);
    db.deliveries[idx].scaleStatus = "Sesuai";
    db.deliveries[idx].scaleDifference = 0;
    db.deliveries[idx].scaleNotes = "Kekurangan dipenuhi oleh Kepala Tani. Data diperbarui.";
    db.deliveries[idx].status = "Diterima";

    writeDB(db);

    triggerNotification(
      "Kekurangan Bahan Baku Terpenuhi",
      `Selisih untuk ${id} telah dipenuhi oleh petani. Status diubah menjadi Sesuai.`,
      "success"
    );

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "TERIMA_KEKURANGAN_TANI",
      `Pemenuhan kekurangan pengiriman ${id}. Timbangan direkonsiliasi menjadi ${resolvedWeight} Kg`,
      req.ip || "127.0.0.1"
    );

    res.json(db.deliveries[idx]);
  });

  // Quality Control Checklist API
  app.get("/api/qc-checklists", (req, res) => {
    const db = readDB();
    res.json(db.qcChecklists || []);
  });

  app.post("/api/qc-checklists", (req, res) => {
    const { deliveryId, checkedWeight, warnaCerah, teksturPadat, tidakBerlendir, tidakAdaBercakBusuk, tidakAdaBagianRusak, rejectWeight, rejectItems, qcNotes, photoUrl, photoMetadata, operator } = req.body;
    const db = readDB();

    const qcId = `QC-${String((db.qcChecklists?.length || 0) + 1).padStart(3, "0")}`;

    // Logic Reject: jika berlendir, ada bercak busuk, atau ada bagian rusak, atau isReject dicentang
    const lBerlendir = !tidakBerlendir; // if true, berlendir => reject
    const lBusuk = !tidakAdaBercakBusuk; // if true, busuk => reject
    const lRusak = !tidakAdaBagianRusak; // if true, rusak => reject
    let isReject = lBerlendir || lBusuk || lRusak;

    const checked = parseFloat(checkedWeight);
    let finalRejectItems = [];
    let rejWeight = 0;

    if (rejectItems && Array.isArray(rejectItems) && rejectItems.length > 0) {
      finalRejectItems = rejectItems.map((item: any) => ({
        commodity: item.commodity,
        rejectWeight: parseFloat(item.rejectWeight) || 0,
        reason: item.reason || "Cacat Mutu"
      }));
      rejWeight = finalRejectItems.reduce((acc: number, curr: any) => acc + curr.rejectWeight, 0);
      if (rejWeight > 0) {
        isReject = true;
      }
    } else {
      rejWeight = isReject ? parseFloat(rejectWeight || checked) : 0;
      if (isReject) {
        let defaultReason = "Cacat Mutu";
        if (lBerlendir) defaultReason = "Berlendir";
        else if (lBusuk) defaultReason = "Bercak Busuk";
        else if (lRusak) defaultReason = "Bagian Rusak";

        // Query delivery details to get its original commodity if available
        const dIdx = db.deliveries.findIndex((d: any) => d.id === deliveryId);
        const fallbackComm = dIdx !== -1 ? db.deliveries[dIdx].commodity : "Wortel";

        finalRejectItems = [
          {
            commodity: fallbackComm,
            rejectWeight: rejWeight,
            reason: defaultReason
          }
        ];
      }
    }

    const passedWeight = Math.max(0, checked - rejWeight);
    const passedPercentage = checked > 0 ? (passedWeight / checked) * 100 : 0;

    const deliveryIndex = db.deliveries.findIndex((d: any) => d.id === deliveryId);
    let commodity = "Umum/Sayur";
    if (deliveryIndex !== -1) {
      commodity = db.deliveries[deliveryIndex].commodity;
      db.deliveries[deliveryIndex].status = "Diproses QC";
      db.deliveries[deliveryIndex].status = isReject && passedWeight <= 0 ? "Ditolak" : "Diterima";
    }

    // Validate and save camera photo physical file on disk + register in photos table
    let savedPhotoUrl = "";
    try {
      savedPhotoUrl = validateAndSavePhoto(
        db,
        photoUrl,
        photoMetadata || {
          timestamp: new Date().toISOString(),
          deviceInfo: "Lab Camera Server Engine (Chrome V8)",
          geolocation: "-6.914755, 107.609855 (Bandung Cold Storage Lab QC)"
        },
        "QC",
        qcId,
        operator?.username || "produksi",
        operator?.role || "Kepala Produksi",
        "",
        commodity,
        `Foto QC ${qcId} - ${commodity} (${isReject ? 'REJECTED' : 'PASSED'})`
      );
    } catch (err: any) {
      console.error("Camera validation error in QC checklist post:", err);
      return res.status(400).json({ message: err.message });
    }

    const newQC = {
      id: qcId,
      deliveryId,
      commodity,
      checkedWeight: checked,
      warnaCerah,
      teksturPadat,
      tidakBerlendir,
      tidakAdaBercakBusuk,
      tidakAdaBagianRusak,
      isReject,
      rejectWeight: rejWeight,
      rejectItems: finalRejectItems,
      passedWeight,
      passedPercentage,
      qcNotes,
      photoUrl: savedPhotoUrl,
      photoMetadata: photoMetadata || {
        timestamp: new Date().toISOString(),
        deviceInfo: "Lab Camera Server Engine (Chrome V8)",
        geolocation: "-6.914755, 107.609855 (Bandung Cold Storage Lab QC)"
      },
      checkedBy: operator?.fullName || "Pemeriksa QC",
      checkedAt: new Date().toISOString()
    };

    db.qcChecklists = db.qcChecklists || [];
    db.qcChecklists.push(newQC);
    writeDB(db);

    if (isReject) {
      triggerNotification(
        "Kategori Barang Reject Ditemukan!",
        `Pemeriksaan QC ${qcId} melacak produk reject ${commodity} sebanyak ${rejWeight} kg (${passedPercentage.toFixed(1)}% lolos).`,
        "error"
      );
    } else {
      triggerNotification(
        "Bahan Baku Lolos Quality Control",
        `Checklist QC ${qcId} untuk ${commodity} dinyatakan 100% Bersih & Prima. Siap diproduksi!`,
        "success"
      );
    }

    logActivity(
      operator?.username || "produksi",
      operator?.role || "Kepala Produksi",
      "QC_CHECKLIST",
      `Melakukan audit QC ${qcId} untuk ${commodity}. Hasil: ${isReject ? 'REJECT' : 'PASSED'} (${passedWeight} Kg lolos, ${rejWeight} Kg reject)`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json(newQC);
  });

  app.delete("/api/qc-checklists/:id/photo", (req, res) => {
    const { id } = req.params;
    const { operator } = req.body || {};
    const db = readDB();

    const idx = db.qcChecklists.findIndex((q: any) => q.id.trim().toUpperCase() === id.trim().toUpperCase());
    if (idx === -1) return res.status(404).json({ message: "Checklist QC tidak ditemukan" });

    // Clean up physical file if it exists on disk
    const oldPhotoUrl = db.qcChecklists[idx].photoUrl;
    if (oldPhotoUrl && !oldPhotoUrl.startsWith("data:") && !oldPhotoUrl.startsWith("http")) {
      const pathsToTry = [
        path.join(process.cwd(), oldPhotoUrl),
        path.join(process.cwd(), "public", oldPhotoUrl),
        oldPhotoUrl.startsWith("/") ? path.join(process.cwd(), oldPhotoUrl.slice(1)) : path.join(process.cwd(), oldPhotoUrl)
      ];
      for (const p of pathsToTry) {
        try {
          if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
            fs.unlinkSync(p);
            console.log(`Physically deleted QC photo file at: ${p}`);
            break;
          }
        } catch (err) {
          console.error("Failed to delete physical QC photo file:", err);
        }
      }
    }

    db.qcChecklists[idx].photoUrl = "";
    writeDB(db);

    logActivity(
      operator?.username || "produksi",
      operator?.role || "Kepala Produksi",
      "DELETE_QC_PHOTO",
      `Menghapus dokumentasi foto dari Checklist QC ${id}`,
      req.ip || "127.0.0.1"
    );

    res.json(db.qcChecklists[idx]);
  });

  // --- INTEGRATED PHOTOS DATABASE API ---
  app.get("/api/photos", (req, res) => {
    const db = readDB();
    res.json(db.photos || []);
  });

  app.post("/api/photos", (req, res) => {
    const { photoUrl, photoMetadata, moduleName, transactionId, username, role, farmerName, commodity, caption } = req.body;
    const db = readDB();

    try {
      const savedPath = validateAndSavePhoto(
        db,
        photoUrl,
        photoMetadata,
        moduleName,
        transactionId,
        username || "admin",
        role || "Admin Gudang",
        farmerName || "",
        commodity || "",
        caption || ""
      );

      // Also update respective delivery or QC checklist's primary photoUrl if they match
      if (moduleName === "Penerimaan") {
        const dIdx = db.deliveries?.findIndex((d: any) => d.id === transactionId);
        if (dIdx !== -1 && dIdx !== undefined) {
          db.deliveries[dIdx].photoUrl = savedPath;
          db.deliveries[dIdx].photoMetadata = photoMetadata;
        }
      } else if (moduleName === "QC") {
        const qIdx = db.qcChecklists?.findIndex((q: any) => q.id === transactionId);
        if (qIdx !== -1 && qIdx !== undefined) {
          db.qcChecklists[qIdx].photoUrl = savedPath;
          db.qcChecklists[qIdx].photoMetadata = photoMetadata;
        }
      }

      writeDB(db);
      res.status(201).json({ message: "Foto berhasil disimpan ke storage & database", filepath: savedPath });
    } catch (err: any) {
      console.error("Error saving photo via general endpoint:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/photos/:id", (req, res) => {
    const { id } = req.params;
    const { caption, operator } = req.body;
    const db = readDB();

    const idx = db.photos?.findIndex((p: any) => p.id === id);
    if (idx === -1 || idx === undefined) {
      return res.status(404).json({ message: "Foto tidak ditemukan di database" });
    }

    db.photos[idx].caption = caption;
    writeDB(db);

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "EDIT_PHOTO_CAPTION",
      `Mengubah keterangan foto ${id} menjadi: "${caption}"`,
      req.ip || "127.0.0.1"
    );

    res.json(db.photos[idx]);
  });

  app.delete("/api/photos/:id", (req, res) => {
    const { id } = req.params;
    const { operator } = req.body || {};
    const db = readDB();

    const idx = db.photos?.findIndex((p: any) => p.id === id);
    if (idx === -1 || idx === undefined) {
      return res.status(404).json({ message: "Foto tidak ditemukan di database" });
    }

    const photo = db.photos[idx];
    
    // Attempt physical deletion
    const filepath = photo.filepath;
    if (filepath) {
      const pathsToTry = [
        path.join(process.cwd(), "public", filepath),
        path.join(process.cwd(), filepath),
        filepath.startsWith("/") ? path.join(process.cwd(), filepath.slice(1)) : path.join(process.cwd(), filepath)
      ];
      for (const p of pathsToTry) {
        try {
          if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
            fs.unlinkSync(p);
            console.log(`Physically unlinked photo file: ${p}`);
            break;
          }
        } catch (err) {
          console.error(`Failed to unlink file ${p}:`, err);
        }
      }
    }

    // Remove from relational photos list
    db.photos.splice(idx, 1);

    writeDB(db);

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "DELETE_PHOTO",
      `Menghapus dokumentasi foto ${id} (${photo.module} - ${photo.transactionId})`,
      req.ip || "127.0.0.1"
    );

    res.json({ message: "Foto berhasil dihapus", id });
  });

  // --- INTEGRATED ERP DOCUMENTS (PDF FORM) API ---
  function getPricePerPack(commodity: string, packageWeight: number): number {
    const basePricePerKg: Record<string, number> = {
      "Wortel": 15000,
      "Buncis": 18000,
      "Jagung Manis": 22000,
      "Sayuran Mix": 20000
    };
    const base = basePricePerKg[commodity] || 15000;
    return base * packageWeight;
  }

  function generatePDFDocumentRecord(
    db: any,
    order: any,
    username: string,
    role: string,
    notes: string = "",
    customStatus?: string
  ) {
    db.documents = db.documents || [];
    const docSeq = String(db.documents.length + 1).padStart(3, "0");
    const docId = `DOC-${docSeq}`;
    const cleanOrderId = order.id.replace("AGP-ORD-2026-", "").replace("AGP-ORD-", "").replace("ORD-", "");
    const docNumber = `FPPB/AP/2026/${cleanOrderId}`;

    // Create folders if not exist
    const publicDir = path.join(process.cwd(), "public");
    const docsDir = path.join(publicDir, "storage", "documents");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const relativePath = `/storage/documents/FPPB_${order.id}_${Date.now()}.pdf`;
    const fullPath = path.join(publicDir, relativePath);

    // Build items copy with computed pricing
    const savedItems = order.items && order.items.length > 0 ? order.items.map((it: any) => {
      const harga = getPricePerPack(it.commodity, it.packageWeight);
      return {
        ...it,
        packageWeight: parseFloat(it.packageWeight),
        quantity: parseInt(it.quantity),
        totalWeight: parseFloat(it.packageWeight) * parseInt(it.quantity),
        harga: harga,
        totalPrice: parseInt(it.quantity) * harga
      };
    }) : [{
      commodity: order.commodity,
      packaging: order.packaging,
      packageWeight: parseFloat(order.packageWeight),
      quantity: parseInt(order.quantity),
      totalWeight: order.totalWeight,
      harga: getPricePerPack(order.commodity, order.packageWeight),
      totalPrice: parseInt(order.quantity) * getPricePerPack(order.commodity, order.packageWeight)
    }];

    const totalQty = savedItems.reduce((sum: number, it: any) => sum + it.quantity, 0);
    const subTotal = savedItems.reduce((sum: number, it: any) => sum + it.totalPrice, 0);

    // Generate physical template text simulation in the "PDF Path" file
    let fileContent = `==========================================================\n` +
                      `               FORM PERMOHONAN PERMINTAAN BARANG           \n` +
                      `                        AGRO PRODUKSI                     \n` +
                      `==========================================================\n` +
                      `NOMOR DOKUMEN   : ${docNumber}\n` +
                      `ORDER ID        : ${order.id}\n` +
                      `TANGGAL PESAN   : ${order.orderDate}\n` +
                      `STATUS ORDER    : ${customStatus || order.status || "Draft"}\n` +
                      `DIVISI PEMESAN  : SBU Bandung - Divisi Logistics & Food Retail\n` +
                      `ALAMAT KIRIM    : Jl. Kinanti No. 26 Kota Bandung\n` +
                      `TANGGAL CETAK   : ${new Date().toLocaleString("id-ID")}\n` +
                      `PETUGAS CETAK   : ${username} (${role})\n` +
                      `----------------------------------------------------------\n` +
                      `DETAIL PERMINTAAN BARANG:\n`;

    savedItems.forEach((it: any, index: number) => {
      fileContent += `${index + 1}. [${it.commodity}] Pack: ${it.packaging} - Qty: ${it.quantity} - @ Rp ${it.harga.toLocaleString("id-ID")} -> Total: Rp ${it.totalPrice.toLocaleString("id-ID")} (${it.totalWeight.toFixed(1)} Kg)\n`;
    });

    fileContent += `----------------------------------------------------------\n` +
                   `TOTAL ITEM      : ${totalQty} Item\n` +
                   `SUB TOTAL       : Rp ${subTotal.toLocaleString("id-ID")}\n` +
                   `GRAND TOTAL     : Rp ${subTotal.toLocaleString("id-ID")}\n` +
                   `==========================================================\n` +
                   `CATATAN TAMBAHAN:\n` +
                   `"${notes || "Mohon dikirimkan dalam kondisi beku suhu -18C."}"\n\n` +
                   `TANDA TANGAN OTORISASI:\n` +
                   `[Digital Authorized Stamp - SBU Bandung Logistik]\n` +
                   `Printed at: ${new Date().toISOString()}\n`;

    fs.writeFileSync(fullPath, fileContent, "utf-8");

    const newDoc = {
      id: docId,
      docNumber,
      orderId: order.id,
      pdfPath: relativePath,
      generateDate: new Date().toISOString(),
      generatedBy: username,
      generatedByRole: role,
      status: customStatus || order.status || "Draft",
      notes: notes || "Mohon dikirimkan dalam kondisi beku suhu -18°C menggunakan kontainer berpendingin.",
      items: savedItems,
      totalQty,
      subTotal,
      grandTotal: subTotal,
      divisi: "SBU Bandung - Divisi Logistics & Food Retail",
      alamat: "Jl. Kinanti No. 26 Kota Bandung",
      tanggalDiterima: order.deliveryDate || order.orderDate
    };

    db.documents.push(newDoc);
    return newDoc;
  }

  app.get("/api/documents", (req, res) => {
    const db = readDB();
    res.json(db.documents || []);
  });

  app.post("/api/documents", (req, res) => {
    const { orderId, username, role, notes, status } = req.body;
    const db = readDB();

    const order = db.orders?.find((o: any) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan." });
    }

    try {
      const doc = generatePDFDocumentRecord(
        db,
        order,
        username || "admin",
        role || "Admin Gudang",
        notes || "",
        status || "Draft"
      );
      writeDB(db);

      logActivity(
        username || "admin",
        role || "Admin Gudang",
        "GENERATE_DOCUMENT",
        `Men-generate manual dokumen permintaan ${doc.docNumber} untuk order ${orderId}`,
        req.ip || "127.0.0.1"
      );

      res.status(201).json(doc);
    } catch (err: any) {
      console.error("Error generating ERP document:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/documents/:id", (req, res) => {
    const { id } = req.params;
    const { status, notes, operator } = req.body;
    const db = readDB();

    const idx = db.documents?.findIndex((d: any) => d.id === id);
    if (idx === -1 || idx === undefined) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const doc = db.documents[idx];
    const order = db.orders?.find((o: any) => o.id === doc.orderId);

    if (status) doc.status = status;
    if (notes !== undefined) doc.notes = notes;

    // Simulate update/re-generate file
    doc.generateDate = new Date().toISOString();
    doc.generatedBy = operator?.username || "admin";
    doc.generatedByRole = operator?.role || "Admin Gudang";

    // Attempt to rewrite simulated PDF
    try {
      const publicDir = path.join(process.cwd(), "public");
      const fullPath = path.join(publicDir, doc.pdfPath);

      let fileContent = `==========================================================\n` +
                        `    RE-GENERATED: FORM PERMOHONAN PERMINTAAN BARANG      \n` +
                        `                        AGRO PRODUKSI                     \n` +
                        `==========================================================\n` +
                        `NOMOR DOKUMEN   : ${doc.docNumber}\n` +
                        `ORDER ID        : ${doc.orderId}\n` +
                        `STATUS BARU     : ${doc.status}\n` +
                        `DIVISI PEMESAN  : ${doc.divisi}\n` +
                        `ALAMAT KIRIM    : ${doc.alamat}\n` +
                        `TANGGAL CETAK   : ${new Date().toLocaleString("id-ID")}\n` +
                        `PETUGAS CETAK   : ${doc.generatedBy} (${doc.generatedByRole})\n` +
                        `----------------------------------------------------------\n` +
                        `DETAIL PERMINTAAN BARANG:\n`;

      doc.items?.forEach((it: any, index: number) => {
        fileContent += `${index + 1}. [${it.commodity}] Pack: ${it.packaging} - Qty: ${it.quantity} - @ Rp ${it.harga.toLocaleString("id-ID")} -> Total: Rp ${it.totalPrice.toLocaleString("id-ID")} (${it.totalWeight.toFixed(1)} Kg)\n`;
      });

      fileContent += `----------------------------------------------------------\n` +
                     `TOTAL ITEM      : ${doc.totalQty} Item\n` +
                     `SUB TOTAL       : Rp ${doc.subTotal.toLocaleString("id-ID")}\n` +
                     `GRAND TOTAL     : Rp ${doc.subTotal.toLocaleString("id-ID")}\n` +
                     `==========================================================\n` +
                     `CATATAN UPDATE:\n` +
                     `"${doc.notes}"\n\n` +
                     `Printed at: ${new Date().toISOString()}\n`;

      fs.writeFileSync(fullPath, fileContent, "utf-8");
    } catch (err) {
      console.error("Failed to rewrite physical doc text:", err);
    }

    writeDB(db);

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "REGENERATE_DOCUMENT",
      `Meng-update dan re-generate dokumen permintaan ${doc.docNumber} dengan status ${doc.status}`,
      req.ip || "127.0.0.1"
    );

    res.json(doc);
  });

  app.delete("/api/documents/:id", (req, res) => {
    const { id } = req.params;
    const { operator } = req.body || {};
    const db = readDB();

    const idx = db.documents?.findIndex((d: any) => d.id === id);
    if (idx === -1 || idx === undefined) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const doc = db.documents[idx];
    const pdfPath = doc.pdfPath;

    // Delete physically
    if (pdfPath) {
      const publicDir = path.join(process.cwd(), "public");
      const fullPath = path.join(publicDir, pdfPath);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Physically unlinked PDF: ${fullPath}`);
        }
      } catch (err) {
        console.error(`Failed to unlink file ${fullPath}:`, err);
      }
    }

    db.documents.splice(idx, 1);
    writeDB(db);

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "DELETE_DOCUMENT",
      `Menghapus dokumen permohonan permintaan barang ${doc.docNumber}`,
      req.ip || "127.0.0.1"
    );

    res.json({ message: "Dokumen berhasil dihapus", id });
  });

  // Production Schedules and Jobs
  app.get("/api/productions", (req, res) => {
    const db = readDB();
    res.json(db.productions || []);
  });

  app.post("/api/productions", (req, res) => {
    const { orderId, qcChecklistId, commodity, targetWeight, allocatedRawMaterial, date, startTime, endTime, pic, operatorNames, operator } = req.body;
    const db = readDB();

    const prodId = `PROD-${String((db.productions?.length || 0) + 1).padStart(3, "0")}`;

    // Alur produksi terstandarisasi mendalam sesuai komoditas - REVISI 8
    let steps: string[] = [];
    if (commodity === "Wortel") {
      steps = [
        "Pencucian berputar bertekanan hulu",
        "Pengupasan kulit terluar wortel (peeling)",
        "Pemotongan bentuk dadu rapi (dicing 10x10mm)",
        "Penyortiran visual grade sortase",
        "Preheating / Blanching air panas 95°C",
        "Chilling perendaman cepat air es 4°C",
        "Uji keempukan tekstur wortel steril & Penirisan mesin spinner",
        "Produksi selesai"
      ];
    } else if (commodity === "Buncis") {
      steps = [
        "Pemotongan serat & ujung pod buncis",
        "Pemotongan buncis bintik ukuran rata 2-3cm",
        "Pencucian berputar bertekanan",
        "Pemeriksaan standard kelayuan buncis segar",
        "Blanching air panas 98°C steril wadah stainless",
        "Chilling perendaman air es cepat 4°C",
        "Penirisan mesin buncis spinner",
        "Produksi selesai"
      ];
    } else if (commodity === "Jagung Manis") {
      steps = [
        "Pengupasan klobot jagung & pembersihan sutera",
        "Pencucian berputar bertekanan",
        "Pemipilan biji jagung manis (kerneling)",
        "Penyortiran kernel pecah, kecil, atau hitam",
        "Steam Blanching uap panas merata 95°C",
        "Chilling perendaman air es cepat 4°C",
        "Penirisan mesin spinner jagung otomatis",
        "Produksi selesai"
      ];
    } else {
      steps = [
        "Preparasi komposisi bahan sayuran bauran",
        "Pencampuran / Blending homogen (Wortel, Buncis, Jagung)",
        "Pencucian menyeluruh air mengalir",
        "Blanching air panas steril 95°C",
        "Chilling air es cepat 4°C",
        "Penirisan mesin spinner otomatis",
        "Pemeriksaan hasil akhir campuran sayuran beku",
        "Produksi selesai"
      ];
    }

    const newJob = {
      id: prodId,
      orderId,
      qcChecklistId, // Save the link formally
      commodity,
      targetWeight: parseFloat(targetWeight),
      allocatedRawMaterial: parseFloat(allocatedRawMaterial),
      date,
      startTime,
      endTime,
      pic,
      operatorNames: Array.isArray(operatorNames) ? operatorNames : [operatorNames],
      currentStepIndex: 0,
      steps,
      packaging: {
        packageType: "1 Kg" as const,
        unitWeight: 1,
        completedUnits: 0,
        isVacuumChecked: false,
        vacuumCheckedBy: "",
        isStoredInFreezer: false
      },
      yieldWeight: 0,
      status: "Jadwal" as const,
      createdAt: new Date().toISOString()
    };

    db.productions = db.productions || [];
    db.productions.push(newJob);

    // Auto-update order status if linked to order
    if (orderId) {
      const oIdx = db.orders.findIndex((o: any) => o.id === orderId);
      if (oIdx !== -1) {
        db.orders[oIdx].status = "Diproses";
      }
    }

    writeDB(db);

    triggerNotification(
      "Jadwal Produksi Baru",
      `Jadwal produksi ${prodId} untuk ${commodity} (${targetWeight} kg) dengan QC-Passed ${qcChecklistId || "Stok"} dijadwalkan tanggal ${date}.`,
      "info"
    );

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "BUAT_JADWAL_PRODUKSI",
      `Menetapkan jadwal produksi ${prodId} (${commodity} - Target: ${targetWeight} kg) didukung QC Lulus ${qcChecklistId || "N/A"}`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json(newJob);
  });

  app.put("/api/productions/:id/advance", (req, res) => {
    const { id } = req.params;
    const { currentStepIndex, status, operator } = req.body;
    const db = readDB();

    const idx = db.productions.findIndex((p: any) => p.id === id);
    if (idx === -1) return res.status(404).json({ message: "Job produksi tidak ditemukan" });

    db.productions[idx].currentStepIndex = parseInt(currentStepIndex);
    db.productions[idx].status = status;
    writeDB(db);

    logActivity(
      operator?.username || "produksi",
      operator?.role || "Kepala Produksi",
      "LANJUT_PRODUKSI",
      `Langkah produksi ${id} diperbarui: ${status} (Tahapan: ${currentStepIndex}/${db.productions[idx].steps.length})`,
      req.ip || "127.0.0.1"
    );

    res.json(db.productions[idx]);
  });

  // Packaging and Yield Input
  app.put("/api/productions/:id/packaging", (req, res) => {
    const { id } = req.params;
    const { packageType, unitWeight, completedUnits, yieldItems, isVacuumChecked, vacuumCheckedBy, isStoredInFreezer, freezerName, operator } = req.body;
    const db = readDB();

    const idx = db.productions.findIndex((p: any) => p.id === id);
    if (idx === -1) return res.status(404).json({ message: "Job produksi tidak ditemukan" });

    let finalYieldItems = [];
    let calculatedYieldWeight = 0;
    let fallbackUnits = parseInt(completedUnits) || 0;
    let fallbackWeightPerUnit = parseFloat(unitWeight) || 0;

    if (yieldItems && Array.isArray(yieldItems) && yieldItems.length > 0) {
      finalYieldItems = yieldItems.map((item: any) => ({
        commodity: item.commodity || db.productions[idx].commodity,
        packageType: item.packageType || "1 Kg",
        unitWeight: parseFloat(item.unitWeight) || 0,
        completedUnits: parseInt(item.completedUnits) || 0,
        totalWeight: parseFloat(item.totalWeight) || 0
      }));
      calculatedYieldWeight = finalYieldItems.reduce((acc: number, curr: any) => acc + curr.totalWeight, 0);
      
      // Update fallback values for backward compatibility
      fallbackUnits = finalYieldItems.reduce((acc: number, curr: any) => acc + curr.completedUnits, 0);
      fallbackWeightPerUnit = finalYieldItems[0]?.unitWeight || 0;
    } else {
      calculatedYieldWeight = fallbackUnits * fallbackWeightPerUnit;
      finalYieldItems = [
        {
          commodity: db.productions[idx].commodity,
          packageType: packageType || "1 Kg",
          unitWeight: fallbackWeightPerUnit,
          completedUnits: fallbackUnits,
          totalWeight: calculatedYieldWeight
        }
      ];
    }

    db.productions[idx].packaging = {
      packageType: packageType || (finalYieldItems[0]?.packageType || "1 Kg"),
      unitWeight: fallbackWeightPerUnit,
      completedUnits: fallbackUnits,
      isVacuumChecked,
      vacuumCheckedBy,
      isStoredInFreezer,
      storedAt: freezerName
    };
    db.productions[idx].yieldWeight = calculatedYieldWeight;
    db.productions[idx].yieldItems = finalYieldItems;
    db.productions[idx].status = "Selesai";
    db.productions[idx].currentStepIndex = db.productions[idx].steps.length;

    // Update corresponding SBU order status to 'Selesai' if linked
    const ordId = db.productions[idx].orderId;
    if (ordId) {
      const oIdx = db.orders.findIndex((o: any) => o.id === ordId);
      if (oIdx !== -1) {
        db.orders[oIdx].status = "Selesai";
      }
    }

    writeDB(db);

    triggerNotification(
      "Hasil Produksi Disimpan & Disegel",
      `Produksi ${id} selesai dengan ${finalYieldItems.length} spesifikasi kemasan. Total output: ${calculatedYieldWeight} Kg disimpan di ${freezerName}.`,
      "success"
    );

    logActivity(
      operator?.username || "produksi",
      operator?.role || "Kepala Produksi",
      "SIMPAN_HASIL_PRODUKSI",
      `Mengunci output kemasan multi-item ${id} (${finalYieldItems.length} baris, total ${calculatedYieldWeight} Kg) masuk ke unit ${freezerName}.`,
      req.ip || "127.0.0.1"
    );

    res.json(db.productions[idx]);
  });

  // HPP Calculator
  app.get("/api/hpp", (req, res) => {
    const db = readDB();
    res.json(db.hppRecords || []);
  });

  app.post("/api/hpp", (req, res) => {
    const { productionJobId, rawMaterialCost, laborCost, operationalCost, packagingCost, depreciationCost, distributionCost, operator } = req.body;
    const db = readDB();

    const hppId = `HPP-${String((db.hppRecords?.length || 0) + 1).padStart(3, "0")}`;

    const prodJob = db.productions.find((p: any) => p.id === productionJobId);
    if (!prodJob) {
      return res.status(400).json({ message: "ID Job produksi tidak valid." });
    }

    const yieldWeight = prodJob.yieldWeight || prodJob.targetWeight;
    const totalCost = parseFloat(rawMaterialCost) + parseFloat(laborCost) + parseFloat(operationalCost) + parseFloat(packagingCost) + parseFloat(depreciationCost) + parseFloat(distributionCost);
    const hppPerKg = Math.round(totalCost / yieldWeight);

    const newHpp = {
      id: hppId,
      productionJobId,
      commodity: prodJob.commodity,
      productionYield: yieldWeight,
      rawMaterialCost: parseFloat(rawMaterialCost),
      laborCost: parseFloat(laborCost),
      operationalCost: parseFloat(operationalCost),
      packagingCost: parseFloat(packagingCost),
      depreciationCost: parseFloat(depreciationCost),
      distributionCost: parseFloat(distributionCost),
      totalCost,
      hppPerKg,
      calculatedAt: new Date().toISOString()
    };

    db.hppRecords = db.hppRecords || [];
    db.hppRecords.push(newHpp);
    writeDB(db);

    triggerNotification(
      "HPP Dihitung",
      `HPP produk ${prodJob.commodity} (${hppId}) ditetapkan sebesar Rp ${hppPerKg.toLocaleString()}/Kg.`,
      "success"
    );

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "HITUNG_HPP",
      `Kalkulasi HPP ${hppId} untuk ${prodJob.commodity}. Total biaya: Rp ${totalCost.toLocaleString()} (HPP: Rp ${hppPerKg}/kg)`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json(newHpp);
  });

  // Custom HPP Records API (flexible product calculator)
  app.get("/api/custom-hpp", (req, res) => {
    const db = readDB();
    res.json(db.customHppRecords || []);
  });

  app.post("/api/custom-hpp", (req, res) => {
    const { productName, materials, laborCost, laborCostPerUnit, overheadCost, overheadCostPerUnit, yieldUnits, operator, sellingPrice, marginAmount, marginPercentage } = req.body;
    const db = readDB();

    const customId = `CHPP-${String((db.customHppRecords?.length || 0) + 1).padStart(3, "0")}`;

    const totalMaterialCost = Array.isArray(materials)
      ? materials.reduce((sum: number, m: any) => sum + (parseFloat(m.price) || 0), 0)
      : 0;

    const qty = parseFloat(yieldUnits) || 1;
    // Handle both old structure (laborCostPerUnit/overheadCostPerUnit) and new total structure (laborCost/overheadCost)
    const labor = parseFloat(laborCost) !== undefined && !isNaN(parseFloat(laborCost))
      ? parseFloat(laborCost)
      : (parseFloat(laborCostPerUnit) || 0) * qty;

    const overhead = parseFloat(overheadCost) !== undefined && !isNaN(parseFloat(overheadCost))
      ? parseFloat(overheadCost)
      : (parseFloat(overheadCostPerUnit) || 0) * qty;

    const calculatedHpp = qty > 0 ? Math.round((totalMaterialCost + labor + overhead) / qty) : 0;

    const newCustomHpp = {
      id: customId,
      productName,
      materials: materials || [],
      totalMaterialCost,
      laborCost: labor,
      overheadCost: overhead,
      laborCostPerUnit: qty > 0 ? Math.round(labor / qty) : 0,
      overheadCostPerUnit: qty > 0 ? Math.round(overhead / qty) : 0,
      yieldUnits: qty,
      calculatedHpp,
      sellingPrice: parseFloat(sellingPrice) || 0,
      marginAmount: parseFloat(marginAmount) || 0,
      marginPercentage: parseFloat(marginPercentage) || 0,
      calculatedAt: new Date().toISOString()
    };

    db.customHppRecords = db.customHppRecords || [];
    db.customHppRecords.push(newCustomHpp);
    writeDB(db);

    triggerNotification(
      "Kalkulasi HPP Selesai",
      `HPP simulasi untuk ${productName} (${customId}) dihitung sebesar Rp ${calculatedHpp.toLocaleString()}/Unit.`,
      "success"
    );

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "HITUNG_SIMULASI_HPP",
      `Kalkulasi HPP simulasi ${customId} untuk ${productName}. Hasil HPP: Rp ${calculatedHpp}/unit (Bahan: Rp ${totalMaterialCost.toLocaleString()}, Qty: ${qty} Unit)`,
      req.ip || "127.0.0.1"
    );

    res.status(201).json(newCustomHpp);
  });

  // Notifications API
  app.get("/api/notifications", (req, res) => {
    const db = readDB();
    res.json(db.notifications || []);
  });

  app.put("/api/notifications/read-all", (req, res) => {
    const db = readDB();
    db.notifications = (db.notifications || []).map((n: any) => ({ ...n, read: true }));
    writeDB(db);
    res.json({ success: true });
  });

  // Shipments API (Send SBU Order)
  app.post("/api/shipments", (req, res) => {
    const { orderId, driverName, vehicleNumber, operator } = req.body;
    const db = readDB();

    const oIdx = db.orders.findIndex((o: any) => o.id === orderId);
    if (oIdx === -1) return res.status(404).json({ message: "Order tidak ditemukan." });

    db.orders[oIdx].status = "Dikirim";
    db.orders[oIdx].driverName = driverName || "Agus Salim";
    db.orders[oIdx].vehicleNumber = vehicleNumber || "D 1902 FZ";
    db.orders[oIdx].dispatchedAt = new Date().toISOString();
    writeDB(db);

    triggerNotification(
      "Barang Dikirim ke Bandung",
      `Shipment order ${orderId} sedang dijalan bersama kurir ${driverName} (${vehicleNumber}).`,
      "success"
    );

    logActivity(
      operator?.username || "admin",
      operator?.role || "Admin Gudang",
      "KIRIM_BARANG_SBU",
      `Mengirimkan komoditas ${db.orders[oIdx].commodity} (${db.orders[oIdx].totalWeight} kg) untuk order ${orderId} melalui armada ${vehicleNumber}`,
      req.ip || "127.0.0.1"
    );

    res.json({
      success: true,
      order: db.orders[oIdx]
    });
  });

  // Dashboard Aggregated Operational Metrics
  app.get("/api/dashboard-stats", (req, res) => {
    const db = readDB();

    const orders = db.orders || [];
    const productions = db.productions || [];
    const checklists = db.qcChecklists || [];
    const hpp = db.hppRecords || [];

    // Totals
    const totalOrder = orders.length;
    const totalProdKg = productions.reduce((acc: number, curr: any) => acc + (curr.yieldWeight || 0), 0);
    const totalRejectKg = checklists.reduce((acc: number, curr: any) => acc + (curr.rejectWeight || 0), 0);

    // Calculated revenue / financial projections (Let's assume static contract pricing per finished frozen vegetable kg)
    // Wortel: Rp 25.000/kg, Buncis: Rp 30.000/kg, Jagung: Rp 22.000/kg, Mix: Rp 28.000/kg
    const pricingMap: Record<string, number> = {
      "Wortel": 25000,
      "Buncis": 30000,
      "Jagung Manis": 22000,
      "Sayuran Mix": 28000
    };

    let totalRevenue = 0;
    orders.forEach((o: any) => {
      if (o.status === "Selesai" || o.status === "Dikirim") {
        const rate = pricingMap[o.commodity] || 25000;
        totalRevenue += o.totalWeight * rate;
      }
    });

    // Estimate Profit = Revenue of resolved batches - integrated HPP total cost of resolved batches
    let totalHppCosts = hpp.reduce((acc: number, curr: any) => acc + (curr.totalCost || 0), 0);
    const estimatedProfit = Math.max(0, totalRevenue - totalHppCosts);

    // Commodity yield summaries
    const breakdownCommodity = {
      "Wortel": 0,
      "Buncis": 0,
      "Jagung Manis": 0,
      "Sayuran Mix": 0
    };
    productions.forEach((p: any) => {
      const type = p.commodity as keyof typeof breakdownCommodity;
      if (breakdownCommodity[type] !== undefined) {
        breakdownCommodity[type] += (p.yieldWeight || 0);
      }
    });

    res.json({
      totalOrder,
      totalProdKg,
      totalRejectKg,
      totalRevenue,
      estimatedProfit,
      breakdownCommodity,
      recentLogs: db.auditLogs.slice(0, 5),
      recentNotifs: db.notifications.slice(0, 10)
    });
  });

  // -------------------------------------------------------------
  // VITE DEV / PRODUCTION STATIC HOSTING
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Handle express v5 or generic errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("System Uncaught Error:", err);
    res.status(500).json({ message: "Terjadi gangguan sistem internal.", error: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frozen Vegetable WMS server is actively listening on http://localhost:${PORT}`);
  });
}

startServer();
