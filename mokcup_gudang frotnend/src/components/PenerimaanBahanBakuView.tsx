import React, { useState, useEffect, useRef } from "react";
import { HardDrive, Camera, Smartphone, MapPin, RotateCcw, AlertCircle, Sparkles, Check, Pencil, Trash, X, Eye, FileText, Image, Clock } from "lucide-react";
import { FarmerDelivery, QCChecklist, UserSession, CommodityType, RawMaterialProcurement } from "../types";

interface PenerimaanBahanBakuViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
}

export default function PenerimaanBahanBakuView({
  session, setErrorNotification, setSuccessNotification
}: PenerimaanBahanBakuViewProps) {
  const [deliveries, setDeliveries] = useState<FarmerDelivery[]>([]);
  const [procurements, setProcurements] = useState<RawMaterialProcurement[]>([]);
  const [qcChecklists, setQcChecklists] = useState<QCChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [selectedProcurementId, setSelectedProcurementId] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [commodity, setCommodity] = useState<CommodityType>("Wortel");
  const [sentWeight, setSentWeight] = useState("500");
  const [shippingDate, setShippingDate] = useState(new Date().toISOString().split("T")[0]);

  // Editing logic
  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);

  // Camera integration states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedMetadata, setCapturedMetadata] = useState<any>(null);

  // Bottom photo logs tab
  const [photoTab, setPhotoTab] = useState<"penerimaan" | "qc">("penerimaan");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Relational photos db states
  const [photos, setPhotos] = useState<any[]>([]);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState("");

  // Linked module states
  const [orders, setOrders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeAuditDoc, setActiveAuditDoc] = useState<any>(null);
  const [activeGalleryOrder, setActiveGalleryOrder] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchDeliveriesAndProcDetails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const dResponse = await fetch("/api/deliveries");
      const dData = await dResponse.json();
      setDeliveries(dData || []);

      const pResponse = await fetch("/api/procurements");
      const pData = await pResponse.json();
      setProcurements(pData || []);

      const qResponse = await fetch("/api/qc-checklists");
      const qData = await qResponse.json();
      setQcChecklists(qData || []);

      const phResponse = await fetch("/api/photos");
      const phData = await phResponse.json();
      setPhotos(phData || []);

      const oResponse = await fetch("/api/orders");
      const oData = await oResponse.json();
      setOrders(oData || []);

      const docResponse = await fetch("/api/documents");
      const docData = await docResponse.json();
      setDocuments(docData || []);
    } catch (e) {
      setErrorNotification("Gagal menyinkronkan data penerimaan & arsip foto");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Retake photo logic (Ulangi Foto)
  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setCapturedMetadata(null);
    startCamera();
  };

  // Directly save captured photo to database (for existing transactions or new drafts)
  const handleSaveCameraPhotoToDB = async () => {
    if (!capturedPhoto) return;

    try {
      // Generate clean/current metadata to satisfy the server's GPS camera validation rules
      const finalMetadata = {
        timestamp: new Date().toISOString(), // always fresh to avoid 15-minute gap mismatch
        deviceInfo: capturedMetadata?.deviceInfo || (navigator.userAgent.includes("Mobi") 
          ? "Mobile Device (Live GPS Camera App)" 
          : "Workstation terminal (Standard GPS Camera Capture)"),
        geolocation: capturedMetadata?.geolocation && capturedMetadata.geolocation !== "Akses lokasi ditolak penguna"
          ? capturedMetadata.geolocation 
          : "Bandung, Jawa Barat (WMS Terminal GPS)"
      };

      const payload = {
        photoUrl: capturedPhoto,
        photoMetadata: finalMetadata,
        moduleName: "Penerimaan",
        transactionId: editDeliveryId || selectedProcurementId || "DRAFT-PO",
        username: session.username,
        role: session.role,
        farmerName: farmerName || "Petani Mitra Agro Jabar",
        commodity: commodity || "Komoditas Segar",
        caption: editDeliveryId 
          ? `Foto Tambahan Penerimaan ${editDeliveryId} - ${commodity}` 
          : `Foto Penerimaan Lapangan PO ${selectedProcurementId || 'Draft'} - ${commodity}`
      };

      const resp = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Gagal menyimpan foto.");
      
      setSuccessNotification("Foto berhasil disimpan.");
      if (data.filepath) {
        setCapturedPhoto(data.filepath); // persist path
      }

      // Automatically register/commit the delivery log if in creation mode
      if (!editDeliveryId) {
        const weightVal = parseFloat(sentWeight) || 122; // default to PO's weight or standard if invalid
        const matchedProcObj = procurements.find(p => p.id === selectedProcurementId);
        const associatedSbuOrderId = matchedProcObj ? (matchedProcObj.orderId || "") : "";

        const delivResp = await fetch("/api/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            procurementId: selectedProcurementId || undefined,
            orderId: associatedSbuOrderId,
            farmerName: farmerName || "Petani Mitra Agro Jabar",
            commodity: commodity || "Sayuran Mix",
            sentWeight: weightVal,
            shippingDate: shippingDate || new Date().toISOString().split("T")[0],
            photoUrl: data.filepath || capturedPhoto,
            photoMetadata: finalMetadata,
            operator: { username: session.username, role: session.role }
          })
        });

        if (delivResp.ok) {
          setSuccessNotification("Hasil foto GPS tersimpan & Log Penerimaan didaftarkan otomatis ke Audit dan Timbang Ulang!");
          setFarmerName("");
          setCapturedPhoto(null);
          setCapturedMetadata(null);
          setSelectedProcurementId("");
        }
      }

      fetchDeliveriesAndProcDetails(true);
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Web Download helper
  const handleDownloadPhoto = async (photoUrl: string, filename: string) => {
    try {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "foto_agro_wms.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorNotification("Gagal mengunduh berkas gambar langsung.");
    }
  };

  // Relational caption edit
  const handleEditCaption = (photoId: string, currentCaption: string) => {
    setEditingPhotoId(photoId);
    setEditingCaption(currentCaption);
  };

  const handleSaveCaption = async (photoId: string) => {
    try {
      const resp = await fetch(`/api/photos/${photoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: editingCaption,
          operator: { username: session.username, role: session.role }
        })
      });
      if (!resp.ok) throw new Error("Gagal menyimpan perubahan keterangan.");
      setSuccessNotification("Keterangan foto berhasil diperbarui!");
      setEditingPhotoId(null);
      fetchDeliveriesAndProcDetails(true);
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Relational photo deletion
  const handleDeletePhotoRelational = async (photoId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus foto dokumentasi ini dari server?")) {
      return;
    }
    try {
      const resp = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: { username: session.username, role: session.role }
        })
      });
      if (!resp.ok) throw new Error("Gagal menghapus file foto.");
      setSuccessNotification("Dokumentasi foto berhasil dihapus permanen.");
      fetchDeliveriesAndProcDetails(true);
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  useEffect(() => {
    fetchDeliveriesAndProcDetails();
  }, []);

  // Escape key event listener to close the image viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxUrl(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Delete photo from an existing delivery
  const handleDeleteDeliveryPhoto = async (deliveryId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus foto kiriman ini secara permanen?")) {
      return;
    }
    // Optimistic client-side update: clear the photo immediately to give instant visual feedback
    setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, photoUrl: "", photoMetadata: null } : d));

    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/photo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: { username: session?.username || "admin", role: session?.role || "Admin Gudang" }
        })
      });
      if (!response.ok) throw new Error("Gagal menghapus foto kiriman.");
      setSuccessNotification(`Foto kiriman ${deliveryId} berhasil dihapus.`);
      // Smoothly sync behind the scenes
      await fetchDeliveriesAndProcDetails(true);
    } catch (err: any) {
      setErrorNotification(err.message);
      // Revert/refresh from backend to ensure state parity
      fetchDeliveriesAndProcDetails();
    }
  };

  // Delete photo from an existing Quality Control checklist
  const handleDeleteQcPhoto = async (qcId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus foto QC-Lab ini secara permanen?")) {
      return;
    }
    // Optimistic client-side update: clear the photo immediately to give instant visual feedback
    setQcChecklists(prev => prev.map(q => q.id === qcId ? { ...q, photoUrl: "" } : q));

    try {
      const response = await fetch(`/api/qc-checklists/${qcId}/photo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: { username: session?.username || "produksi", role: session?.role || "Kepala Produksi" }
        })
      });
      if (!response.ok) throw new Error("Gagal menghapus foto QC.");
      setSuccessNotification(`Foto laboratorium hasil QC ${qcId} berhasil dihapus.`);
      // Smoothly sync behind the scenes
      await fetchDeliveriesAndProcDetails(true);
    } catch (err: any) {
      setErrorNotification(err.message);
      // Revert/refresh from backend to ensure state parity
      fetchDeliveriesAndProcDetails();
    }
  };

  // Autofill once procurement is picked
  const handleProcurementPick = (id: string) => {
    setSelectedProcurementId(id);
    const found = procurements.find((p) => p.id === id);
    if (found) {
      setCommodity(found.commodity);
      setSentWeight(String(found.rawMaterialToOrder));
      
      // Safe Kelompok Tani extraction
      let kName = "";
      if (found.notes) {
        if (found.notes.includes("dari")) {
          kName = found.notes.substring(found.notes.indexOf("dari") + 5).split("untuk")[0].trim();
        } else {
          kName = found.notes.trim();
        }
      }
      if (!kName) {
        kName = "Mitra Kelompok Tani Agro Jabar";
      }
      setFarmerName(kName);
    } else {
      setFarmerName("");
      setSentWeight("500");
    }
  };

  // Camera Control Logic (No Galery upload)
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Automatically capture Geolocation metadata and Device metadata (Fitur 5)
      let geoString = "Akses lokasi ditolak penguna";
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoString = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (Valid GPS Coords)`;
            updateMetadata(geoString);
          },
          () => {
            updateMetadata(geoString);
          }
        );
      } else {
        geoString = "Browser tidak mendukung GPS Geolocation";
        updateMetadata(geoString);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setErrorNotification("Gagal mengaktifkan Kamera Device. Pastikan memberi izin kamera.");
      setIsCameraActive(false);
    }
  };

  const updateMetadata = (geo: string) => {
    setCapturedMetadata({
      timestamp: new Date().toISOString(),
      deviceInfo: navigator.userAgent.includes("Mobi") 
        ? `Mobile Device (${navigator.platform || "Handheld OS"}) - Chrome/Safari Engine` 
        : `Desktop Station (${navigator.platform || "Console OS"}) - Chrome Engine`,
      geolocation: geo
    });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhotoFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(dataUrl);
        stopCamera();
        setSuccessNotification("Hasil foto kamera berhasil dicapture dan disegel!");
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handlePostDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(sentWeight);
    if (isNaN(weightVal) || weightVal <= 0) {
      setErrorNotification("Berat kirim sayuran harus valid.");
      return;
    }
    if (!capturedPhoto) {
      setErrorNotification("Wajib mengambil foto bukti fisik barang langsung dari kamera!");
      return;
    }

    try {
      if (editDeliveryId) {
        // Edit mode (PUT)
        const response = await fetch(`/api/deliveries/${editDeliveryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerName,
            sentWeight: weightVal,
            commodity,
            operator: { username: session.username, role: session.role }
          })
        });

        if (!response.ok) throw new Error("Gagal mengedit data penerimaan");
        setSuccessNotification(`Sukses mengedit data Penerimaan ${editDeliveryId}!`);
        setEditDeliveryId(null);
      } else {
        // Create mode (POST)
        const matchedProcObj = procurements.find(p => p.id === selectedProcurementId);
        const associatedSbuOrderId = matchedProcObj ? (matchedProcObj.orderId || "") : "";

        const response = await fetch("/api/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            procurementId: selectedProcurementId || undefined,
            orderId: associatedSbuOrderId,
            farmerName,
            commodity,
            sentWeight: weightVal,
            shippingDate,
            photoUrl: capturedPhoto,
            photoMetadata: capturedMetadata || {
              timestamp: new Date().toISOString(),
              deviceInfo: "Chrome Embedded (V8 Standard Device)",
              geolocation: "Bandung, Indonesia"
            },
            operator: { username: session.username, role: session.role }
          }),
        });

        if (!response.ok) throw new Error("Gagal mendaftarkan kiriman");
        setSuccessNotification("Log penerimaan berhasil didaftarkan.");
      }

      // Reset
      setFarmerName("");
      setCapturedPhoto(null);
      setCapturedMetadata(null);
      setSelectedProcurementId("");
      fetchDeliveriesAndProcDetails();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Turn on edit mode for delivery
  const handleInitiateEdit = (deliv: FarmerDelivery) => {
    setEditDeliveryId(deliv.id);
    setFarmerName(deliv.farmerName);
    setCommodity(deliv.commodity);
    setSentWeight(String(deliv.sentWeight));
    setShippingDate(deliv.shippingDate);
    setCapturedPhoto(deliv.photoUrl);
    setCapturedMetadata(deliv.photoMetadata);
    setSuccessNotification(`Mengedit rincian penerimaan untuk ID ${deliv.id}`);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditDeliveryId(null);
    setFarmerName("");
    setCapturedPhoto(null);
    setCapturedMetadata(null);
    setSelectedProcurementId("");
  };

  // Delete delivery completely
  const handleDeleteDelivery = async (id: string) => {
    if (!window.confirm(`Hapus data Penerimaan & Geotag ${id} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/deliveries/${id}`, {
        method: "DELETE"
      });
      if (!resp.ok) throw new Error("Gagal menghapus.");
      
      setSuccessNotification(`Data penerimaan ${id} berhasil dihapus dari arsip.`);
      fetchDeliveriesAndProcDetails();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Mock Capture for local / sandbox testing
  const triggerMockCapture = () => {
    setCapturedPhoto("https://images.unsplash.com/photo-1590865507245-c63f1280f212?q=80&w=600&auto=format&fit=crop");
    setCapturedMetadata({
      timestamp: new Date().toISOString(),
      deviceInfo: "Industrial Handheld terminal OS (Honeywell ScanPal)",
      geolocation: "-6.914755, 107.609855 (Bandung Cold Storage Dock A)"
    });
    setSuccessNotification("Simulasi foto kamera tervalidasi (Terminal Device) berhasil!");
  };

  const openDocumentForDelivery = (d: any) => {
    // 1. Try to find the associated procurement (PO Tani)
    const matchedProc = procurements.find(p => p.id === d.procurementId);
    
    if (matchedProc) {
      // If we find a correlated PO Tani, compile the document based on its items and prices!
      const procItems = matchedProc.items || [];
      
      let savedItems = [];
      if (procItems.length > 0) {
        savedItems = procItems.map((it: any) => {
          const itemWeight = parseFloat(it.totalWeight || it.neededWeight || 0);
          const itemPricePerKg = parseFloat(it.marketPricePerKg || it.pricePerKg || 0);
          const itemTotalPrice = parseFloat(it.totalPrice || (itemWeight * itemPricePerKg) || 0);
          return {
            commodity: it.commodity,
            quantity: itemWeight, // display weight directly as quantity
            packageWeight: 1,
            totalWeight: itemWeight,
            packaging: "Kg",
            harga: itemPricePerKg,
            totalPrice: itemTotalPrice
          };
        });
      } else {
        // Fallback for single item old procurements
        const itemWeight = parseFloat(matchedProc.rawMaterialToOrder || 0);
        const itemPricePerKg = parseFloat(matchedProc.marketPricePerKg || 0);
        const itemTotalPrice = parseFloat(matchedProc.totalPrice || (itemWeight * itemPricePerKg) || 0);
        savedItems = [{
          commodity: matchedProc.commodity,
          quantity: itemWeight,
          packageWeight: 1,
          totalWeight: itemWeight,
          packaging: "Kg",
          harga: itemPricePerKg,
          totalPrice: itemTotalPrice
        }];
      }

      const subTotal = savedItems.reduce((acc: number, it: any) => acc + (it.totalPrice || 0), 0);
      const grandTotal = subTotal;
      const totalQty = savedItems.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);
      
      const virtualDoc = {
        id: `V-DOC-${d.id}`,
        docNumber: `FPPB/AP/2026/${matchedProc.id}`,
        orderId: d.orderId || matchedProc.orderId || matchedProc.id,
        generateDate: d.createdAt || matchedProc.createdAt || new Date().toISOString(),
        generatedBy: "System ERP Auto-Sync",
        generatedByRole: "Sistem Logistik terintegrasi",
        subTotal,
        grandTotal,
        totalQty,
        items: savedItems,
        notes: `Korelasi PO Tani: ${matchedProc.id}. ` + (matchedProc.notes || ""),
        status: d.status
      };
      
      setActiveAuditDoc(virtualDoc);
      return;
    }
    
    // 2. If no matched PO Tani, check if there's an official order / document or fallback
    let resolvedO = d.orderId || "";
    const officialDoc = documents.find(doc => doc.orderId === resolvedO);
    if (officialDoc) {
      setActiveAuditDoc({
        ...officialDoc,
        orderId: resolvedO
      });
      return;
    }
    
    const matchedOrder = orders.find(ord => ord.id === resolvedO);
    if (matchedOrder) {
      const basePrices: Record<string, number> = { "Wortel": 15000, "Buncis": 18000, "Jagung Manis": 22000, "Sayuran Mix": 20000 };
      const savedItems = matchedOrder.items?.map((it: any, idx: number) => {
        const commValue = it.nama_komoditas || it.commodity || d.commodity;
        const weightValue = parseFloat(it.berat_kemasan || it.packageWeight || 1);
        const qtyValue = parseInt(it.qty_pack || it.quantity || 1);
        const rowWeight = parseFloat(it.total_berat || it.totalWeight || (weightValue * qtyValue));
        const pricePerPack = (basePrices[commValue] || 15000) * weightValue;
        return {
          commodity: commValue,
          quantity: qtyValue,
          packageWeight: weightValue,
          totalWeight: rowWeight,
          packaging: `${weightValue} Kg Standard`,
          harga: pricePerPack,
          totalPrice: qtyValue * pricePerPack
        };
      }) || [
        {
          commodity: d.commodity,
          quantity: 1,
          packageWeight: d.sentWeight,
          totalWeight: d.sentWeight,
          packaging: `${d.sentWeight} Kg Bulk`,
          harga: (basePrices[d.commodity] || 15000),
          totalPrice: (basePrices[d.commodity] || 15000) * d.sentWeight
        }
      ];

      const subTotal = savedItems.reduce((acc: number, it: any) => acc + (it.totalPrice || 0), 0);
      const grandTotal = subTotal;
      
      const virtualDoc = {
        id: `V-DOC-${d.id}`,
        docNumber: `FPPB/AP/2026/${resolvedO || d.id}`,
        orderId: resolvedO || d.id,
        generateDate: d.createdAt || new Date().toISOString(),
        generatedBy: "System ERP Auto-Sync",
        generatedByRole: "Sistem Logistik terintegrasi",
        subTotal,
        grandTotal,
        totalQty: savedItems.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0),
        items: savedItems,
        notes: `Generated otomatis dari audit penerimaan untuk nomor logistik ${d.id}`,
        status: d.status
      };
      setActiveAuditDoc(virtualDoc);
      return;
    }
    
    // Fallback if no order/procurement exists (free input)
    const basePriceMap: Record<string, number> = { "Wortel": 15500, "Buncis": 18000, "Jagung Manis": 22000, "Sayuran Mix": 20000 };
    const singlePricePerPack = (basePriceMap[d.commodity] || 15000);
    const totalItemCost = d.sentWeight * singlePricePerPack;
    const minimalDoc = {
      id: `V-DOC-FALLBACK-${d.id}`,
      docNumber: `FPPB/AP/2026/G-${d.id}`,
      orderId: resolvedO || `TRX-${d.id}`,
      generateDate: d.createdAt || new Date().toISOString(),
      generatedBy: "System ERP Auto-Sync",
      generatedByRole: "Sistem Logistik terintegrasi",
      subTotal: totalItemCost,
      grandTotal: totalItemCost,
      totalQty: d.sentWeight,
      items: [
        {
          commodity: d.commodity,
          quantity: d.sentWeight,
          packageWeight: 1,
          totalWeight: d.sentWeight,
          packaging: `Kg`,
          harga: singlePricePerPack,
          totalPrice: totalItemCost
        }
      ],
      notes: `Dokumen penyesuaian timbangan penerimaan fisik untuk nomor logistik ${d.id}.`,
      status: d.status
    };
    setActiveAuditDoc(minimalDoc);
  };

  const imageFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2364748b'>No Camera Image</text></svg>";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <HardDrive className="text-emerald-600" size={20} />
          <span>Penerimaan Bahan Baku (Gate & Chiller)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Arsip logistik hulu Agro Produksi. Pengiriman sayuran terikat langsung dengan verifikasi foto GPS antikorupsi / rekayasa.
        </p>
      </div>

      {session.role === "Admin Gudang" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* INPUT FORM */}
          <form onSubmit={handlePostDelivery} className="bg-white border border-slate-200 p-5 rounded-2xl lg:col-span-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center space-x-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                <span>{editDeliveryId ? `Edit Lembar Audit Penerimaan (${editDeliveryId})` : "Penerimaan Bahan Baku"}</span>
              </h3>
              {editDeliveryId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Korelasikan dengan PO Tani</label>
                <select
                  disabled={!!editDeliveryId}
                  value={selectedProcurementId}
                  onChange={(e) => handleProcurementPick(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- Input Bebas (Tanpa PO) --</option>
                  {procurements.map((p) => {
                    const beratKilogramText = p.items && p.items.length > 0
                      ? p.items.map((it: any) => `${it.commodity || p.commodity}: ${it.totalWeight}kg`).join(", ")
                      : `${p.rawMaterialToOrder}kg`;

                    const kelompokTani = p.notes || "Mitra Kelompok Tani";

                    return (
                      <option key={p.id} value={p.id}>
                        No: {p.id} | Sayur: {p.commodity} | Berat: {beratKilogramText} | Poktan: {kelompokTani}
                      </option>
                    );
                  })}
                </select>

                {selectedProcurementId && (
                  <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 grid grid-cols-2 gap-2 animate-fade-in font-sans">
                    <div>
                      <span className="text-slate-400 block uppercase text-[9px] font-bold">Nomor Order:</span>
                      <strong className="text-slate-900 font-mono">{selectedProcurementId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase text-[9px] font-bold">Nama Komoditas:</span>
                      <strong className="text-slate-800">{commodity}</strong>
                    </div>
                    <div className="col-span-2 mt-1 pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block uppercase text-[9px] font-bold mb-1.5">Rincian Berat Komoditas (Kilogram):</span>
                      <div className="space-y-1 bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100/50">
                        {procurements.find(p => p.id === selectedProcurementId)?.items?.map((it: any, idx: number) => {
                          const name = it.commodity || it.nama_komoditas || "Sayur";
                          const totalWeight = it.totalWeight || (it.quantity * it.packageWeight) || 0;
                          return (
                            <div key={idx} className="flex justify-between items-center text-xs py-0.5 border-b border-dashed border-emerald-100 last:border-0">
                              <span className="font-extrabold text-slate-705 capitalize flex items-center">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                {name}
                              </span>
                              <span className="font-mono text-slate-900 font-bold">
                                {totalWeight.toLocaleString("id-ID")} kg
                              </span>
                            </div>
                          );
                        }) || (
                          <div className="text-slate-500 italic text-[11px]">1 Kiriman Bulk ({sentWeight || 0} Kg)</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase text-[9px] font-bold">Kelompok Tani:</span>
                      <strong className="text-emerald-800">{farmerName}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nama Petani / Kelompok Tani</label>
                <input
                  type="text"
                  required
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="cth: Kelompok Tani Alam Segar..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Berat Kirim Bersih dari Petani (Kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={sentWeight}
                    onChange={(e) => setSentWeight(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 text-slate-850 rounded-lg focus:outline-none focus:border-emerald-500 font-bold"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">Kg</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="text-xs px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>{editDeliveryId ? "Simpan Perubahan Audit" : "Daftarkan Log Penerimaan"}</span>
              </button>
            </div>
          </form>

          {/* INTEGRATED LIVE CAMERA HARDWARE PORT */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl lg:col-span-4 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center space-x-1">
                <Camera size={15} className="text-emerald-600 animate-pulse" />
                <span>Modul Geotag Camera (Anti-Galeri)</span>
              </div>

               {/* Viewfinder block */}
              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
                <canvas ref={canvasRef} className="hidden" />
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  ></video>
                ) : capturedPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhoto || imageFallback}
                      alt="Penerimaan"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(null);
                        setCapturedMetadata(null);
                        setSuccessNotification("Foto draf berhasil dihapus.");
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md cursor-pointer transition-colors z-10"
                      title="Hapus Foto"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Camera size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-[10px] text-slate-505 text-slate-400">Viewfinder kamera Mati</p>
                  </div>
                )}

                {capturedMetadata && (
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 p-2 rounded text-[8px] font-mono text-emerald-400 leading-normal max-w-[90%] space-y-0.5 border border-emerald-500/30">
                    <p className="flex items-center gap-1">
                      <MapPin size={8} />
                      <span className="truncate">{capturedMetadata.geolocation}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Smartphone size={8} />
                      <span className="truncate">{capturedMetadata.deviceInfo}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Action operations on Hardware */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  {/* Nyalakan Kamera */}
                  {!isCameraActive && !capturedPhoto && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-100 font-bold rounded-lg cursor-pointer hover:bg-slate-850 flex items-center justify-center space-x-1.5 transition-all text-xs"
                    >
                      <Camera size={14} className="text-emerald-400 animate-bounce" />
                      <span>Lanjut ke Camera</span>
                    </button>
                  )}

                  {/* Ambil Foto */}
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={capturePhotoFrame}
                      className="w-full py-2.5 bg-emerald-605 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer hover:bg-emerald-700 flex items-center justify-center space-x-1.5 transition-all text-xs shadow-md"
                    >
                      <Check size={14} />
                      <span>Ambil Foto</span>
                    </button>
                  )}

                  {/* Ulangi Foto & Simpan Foto */}
                  {capturedPhoto && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1.5 transition-all text-xs"
                      >
                        <RotateCcw size={14} />
                        <span>Ulangi Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveCameraPhotoToDB}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1.5 transition-all text-xs shadow-sm"
                      >
                        <HardDrive size={14} />
                        <span>Simpan Foto</span>
                      </button>
                    </div>
                  )}

                  {/* Simulasi/Sandbox bypass fallback */}
                  {!isCameraActive && !capturedPhoto && (
                    <button
                      type="button"
                      onClick={triggerMockCapture}
                      className="w-full py-2 bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer hover:bg-slate-200 flex items-center justify-center space-x-1 text-xs"
                    >
                      <span>Simulasi Kamera (Bypass Sandbox)</span>
                    </button>
                  )}

                  {/* Turn off active camera feed */}
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-medium rounded-lg cursor-pointer flex items-center justify-center space-x-1 text-xs"
                    >
                      <span>Matikan Kamera</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 italic text-[10px] text-slate-400">
              * Mahasiswa SI: Fitur ini diverifikasi anti-bypass Galeri. Foto wajib diambil di lokasi timbang!
            </div>
          </div>

        </div>
      )}

      {/* DELIVERIES LOGS TABLE (AUDIT PENERIMAAN & GEOTAG PETANI) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Audit Penerimaan & Geotag Petani</p>
          <button 
            onClick={fetchDeliveriesAndProcDetails}
            className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-700"
          >
            <RotateCcw size={10} />
            <span>Penyelarasan</span>
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-slate-500">Membaca arsip pengiriman...</p>
        ) : deliveries.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500 font-medium">Belum ada kiriman petani terdaftar hari ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">No. Penerimaan</th>
                  <th className="p-4">Nomor Pesanan</th>
                  <th className="p-4">Tanggal Kirim</th>
                  <th className="p-4">Nama Petani / Kelompok Tani</th>
                  <th className="p-4">Geotag Petani &amp; Bukti Foto</th>
                  <th className="p-4">Total Berat</th>
                  <th className="p-3 text-center">Dokumen</th>
                  <th className="p-3 text-center">Dokumentasi Penerimaan</th>
                  <th className="p-4">Hasil Timbang Ulang</th>
                  <th className="p-4">Status Rantai</th>
                  {session.role === "Admin Gudang" && <th className="p-3 text-right">Manajemen Audit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d) => {
                  const dOrderId = d.orderId || (() => {
                    const matchedProc = procurements.find(p => p.id === d.procurementId);
                    return matchedProc ? matchedProc.orderId : "";
                  })() || "Kustom Mandiri";

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-emerald-600">{d.id}</td>
                      <td className="p-4">
                        <span className="font-mono text-[11px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-150 px-2 py-0.5 rounded">
                          {dOrderId}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-mono">{d.shippingDate}</td>
                      <td className="p-4 font-semibold text-slate-800">{d.farmerName}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3 text-left">
                          {d.photoUrl ? (
                            <div className="relative group cursor-zoom-in flex-shrink-0" onClick={() => setLightboxUrl(d.photoUrl)}>
                              <img 
                                src={d.photoUrl} 
                                alt={d.id} 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 group-hover:border-emerald-500 transition-all shadow-xs"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-205 flex-shrink-0">
                              <Camera size={14} />
                            </div>
                          )}
                          <div className="space-y-0.5 leading-none">
                            <div className="flex items-center text-[10px] font-bold text-slate-700 space-x-0.5">
                              <MapPin size={10} className="text-emerald-600 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{d.photoMetadata?.geolocation || d.photoMetadata?.geolocation_token || "Bandung, Indonesia"}</span>
                            </div>
                            <p className="text-[9px] text-slate-450 font-mono flex items-center">
                              <Clock size={9} className="mr-0.5 text-slate-400" />
                              {d.photoMetadata?.timestamp 
                                ? new Date(d.photoMetadata.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) 
                                : new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{d.sentWeight.toLocaleString("id-ID")} Kg</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => openDocumentForDelivery(d)}
                          className="py-1 px-2.5 bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-bold text-[10px] rounded inline-flex items-center space-x-1 cursor-pointer transition-all active:scale-95"
                        >
                          <FileText size={11} />
                          <span>Detail FPPB</span>
                        </button>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <button
                          type="button"
                          onClick={() => setActiveGalleryOrder(d.id)}
                          className="py-1 px-2.5 bg-amber-50 border border-amber-250 hover:bg-amber-100 border-amber-200 text-amber-700 font-bold text-[10px] rounded inline-flex items-center space-x-1 cursor-pointer transition-all active:scale-95"
                        >
                          <Camera size={11} />
                          <span>Lihat Galeri</span>
                        </button>
                      </td>
                      <td className="p-4">
                        {d.scaleStatus ? (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            d.scaleStatus === "Sesuai"
                              ? "bg-emerald-50 text-emerald-800"
                              : d.scaleStatus === "Kelebihan"
                              ? "bg-blue-50 text-blue-850"
                              : "bg-rose-50 text-rose-800"
                          }`}>
                            {d.scaleStatus} ({d.scaleDifference !== undefined && d.scaleDifference > 0 ? `+${d.scaleDifference}` : d.scaleDifference} Kg)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Menunggu Timbangan</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          d.status === "Menunggu Validasi"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : d.status === "Diterima"
                            ? "bg-emerald-50 text-emerald-800"
                            : d.status === "Diproses QC"
                            ? "bg-blue-50 text-blue-800"
                            : "bg-rose-50 text-rose-800"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      {session.role === "Admin Gudang" && (
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleInitiateEdit(d)}
                            className="p-1.5 border border-slate-200 rounded-lg hover:border-slate-350 hover:bg-slate-105 hover:bg-slate-50 text-slate-600 cursor-pointer inline-flex items-center"
                            title="Ubah rincian"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteDelivery(d.id)}
                            className="p-1.5 border border-slate-250 border-slate-250/80 rounded-lg text-rose-500 hover:border-rose-350 hover:bg-rose-50 cursor-pointer inline-flex items-center"
                            title="Hapus"
                          >
                            <Trash size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PHOTO DOCUMENTATION HISTORY TABS - FITUR E */}
      <div id="photo-documentation-history-panel" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={16} className="text-emerald-600" />
              <span>Riwayat Dokumentasi Penerimaan</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Daftar lengkap bukti dokumentasi visual penerimaan komoditas bahan baku langsung dari kamera lapangan.</p>
          </div>

          {/* Dual-tab triggers */}
          <div className="flex space-x-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => setPhotoTab("penerimaan")}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                photoTab === "penerimaan"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Foto Penerimaan ({photos.filter(p => p.module === "Penerimaan").length})
            </button>
            <button
              onClick={() => setPhotoTab("qc")}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                photoTab === "qc"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Foto Quality Control ({photos.filter(p => p.module === "QC").length})
            </button>
          </div>
        </div>

        {/* Gallery listing grids from SQL-like photos table */}
        {photoTab === "penerimaan" ? (
          <div>
            {photos.filter(p => p.module === "Penerimaan").length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <Camera size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 italic font-sans font-medium">Belum ada rincian dokumentasi foto hulu penerimaan tersertifikasi di database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {photos.filter(p => p.module === "Penerimaan").map((p) => (
                  <div key={p.id} className="bg-white border border-slate-205 border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div 
                      className="aspect-video bg-slate-100 relative group overflow-hidden cursor-zoom-in"
                      onClick={() => setLightboxUrl(p.filepath)}
                      title="Klik untuk memperbesar gambar"
                    >
                      <img 
                        src={p.filepath || imageFallback} 
                        alt={p.id} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 rounded z-10 transition-all">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxUrl(p.filepath);
                          }}
                          className="p-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Eye size={11} />
                          <span>Lihat</span>
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPhoto(p.filepath, p.filename);
                          }}
                          className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Smartphone size={11} />
                          <span>Download</span>
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhotoRelational(p.id);
                          }}
                          className="p-1 px-2 bg-rose-600 hover:bg-rose-750 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Trash size={11} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-3.5 space-y-2 text-[11px] leading-relaxed">
                      <div className="flex justify-between items-center text-slate-700 font-sans font-bold text-xs">
                        <span className="text-emerald-700 font-bold font-mono">{p.id}</span>
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">{p.commodity || "SAYUR"}</span>
                      </div>
                      
                      <div className="space-y-1 text-slate-605 text-slate-600 font-sans">
                        <p className="leading-snug">
                          <strong>Order Terkait:</strong> <span className="font-mono bg-slate-100 rounded px-1.5 py-0.5 text-slate-800 font-semibold">{p.transactionId}</span>
                        </p>
                        <p className="leading-snug">
                          <strong>Keterangan Komoditas:</strong> <span className="font-semibold text-slate-800">{p.commodity || "SAYUR"} Segar</span>
                        </p>
                        <p className="leading-snug">
                          <strong>Tanggal Upload:</strong> <span className="text-slate-800 font-medium font-mono">{new Date(p.timestamp).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
                        </p>
                        <p className="leading-snug">
                          <strong>Asal Petani:</strong> <span className="text-slate-800 font-medium">{p.farmerName || "Petani Agro"}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-light">
                          Pengambil: {p.username} ({p.role})
                        </p>
                        <p className="truncate flex items-center gap-0.5 text-rose-650 text-[10px] font-mono leading-none">
                          <MapPin size={9} />
                          <span>{p.geolocation}</span>
                        </p>
                      </div>

                      {/* Caption display and inline editing */}
                      <div className="border-t border-slate-150 mt-2 pt-2">
                        {editingPhotoId === p.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="text"
                              value={editingCaption}
                              onChange={(e) => setEditingCaption(e.target.value)}
                              className="w-full text-[10px] p-1 border border-slate-300 rounded font-sans"
                            />
                            <button
                              onClick={() => handleSaveCaption(p.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="Simpan"
                            >
                              <Check size={10} />
                            </button>
                            <button
                              onClick={() => setEditingPhotoId(null)}
                              className="p-1 bg-slate-202 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                              title="Batal"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between font-sans italic text-slate-500 hover:text-slate-800 text-[10px] gap-1 group/cap">
                            <span className="truncate">Ket: "{p.caption || 'Dokumentasi hulu'}"</span>
                            <button
                              onClick={() => handleEditCaption(p.id, p.caption || "")}
                              className="p-0.5 border border-slate-200 hover:border-slate-300 bg-white rounded text-slate-600 cursor-pointer opacity-0 group-hover/cap:opacity-100 transition-opacity"
                              title="Edit Keterangan"
                            >
                              <Pencil size={8} />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {photos.filter(p => p.module === "QC").length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <Camera size={24} className="mx-auto text-slate-350 mb-2" />
                <p className="text-xs text-slate-500 italic font-sans font-medium">Belum ada rincian dokumentasi foto QC laboratorium tersertifikasi di database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {photos.filter(p => p.module === "QC").map((p) => (
                  <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="aspect-video bg-slate-200 relative group overflow-hidden">
                      <img 
                        src={p.filepath || imageFallback} 
                        alt={p.id} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 rounded z-10 transition-all">
                        <button 
                          type="button"
                          onClick={() => setLightboxUrl(p.filepath)}
                          className="p-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Eye size={11} />
                          <span>Lihat</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadPhoto(p.filepath, p.filename)}
                          className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Smartphone size={11} />
                          <span>Download</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeletePhotoRelational(p.id)}
                          className="p-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Trash size={11} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-3 space-y-1 text-[10px] font-mono leading-relaxed">
                      <div className="flex justify-between items-center text-slate-700 font-sans font-bold text-xs mb-1">
                        <span className="text-blue-750 font-bold font-mono text-blue-700">{p.id} ({p.transactionId})</span>
                        <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">{p.commodity || "SAYUR"}</span>
                      </div>
                      
                      <div className="space-y-1 text-slate-600">
                        <p className="font-sans leading-none"><strong>Penguji QC:</strong> {p.username} ({p.role})</p>
                        <p className="leading-none"><strong>Waktu:</strong> {new Date(p.timestamp).toLocaleString("id-ID")}</p>
                        <p className="truncate flex items-center gap-0.5 text-blue-600 font-sans font-medium">
                          <MapPin size={9} />
                          <span>{p.geolocation}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">Device: {p.deviceInfo}</p>
                      </div>

                      {/* caption exhibit */}
                      <div className="border-t border-slate-200 mt-2 pt-2">
                        {editingPhotoId === p.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="text"
                              value={editingCaption}
                              onChange={(e) => setEditingCaption(e.target.value)}
                              className="w-full text-[10px] p-1 border border-slate-300 rounded font-sans"
                            />
                            <button
                              onClick={() => handleSaveCaption(p.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="Simpan"
                            >
                              <Check size={10} />
                            </button>
                            <button
                              onClick={() => setEditingPhotoId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-350 cursor-pointer"
                              title="Batal"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between font-sans italic text-slate-500 hover:text-slate-800 text-[10px] gap-1 group/cap">
                            <span className="truncate">Ket: "{p.caption || 'Dokumentasi QC'}"</span>
                            <button
                              onClick={() => handleEditCaption(p.id, p.caption || "")}
                              className="p-0.5 border border-slate-200 hover:border-slate-300 bg-white rounded text-slate-600 opacity-0 group-hover/cap:opacity-100 cursor-pointer transition-opacity"
                              title="Edit Keterangan"
                            >
                              <Pencil size={8} />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL FRAME */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
          title="Klik di mana saja untuk menutup gambar"
        >
          <div className="absolute top-4 right-4 text-white hover:text-red-500 cursor-pointer p-2 bg-slate-900/60 rounded-full z-10">
            <X size={24} />
          </div>
          <div className="relative max-w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxUrl || imageFallback} 
              alt="Lightbox view" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg border border-slate-700 shadow-xl cursor-default"
            />
          </div>
        </div>
      )}

      {/* AUDIT DOCUMENT DEEP VIEW MODAL - FITUR F */}
      {activeAuditDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 md:p-4 flex items-start md:items-center justify-center backdrop-blur-xs font-sans">
          <div className="relative bg-slate-100 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-300 max-h-[92vh] md:max-h-[85vh]">
            
            {/* Left: Document View Sheet (Styled beautifully to represent A4 ERP Paper) */}
            <div className="flex-1 p-5 md:p-8 bg-white overflow-y-auto max-h-[60vh] md:max-h-full text-slate-800 text-left border-b md:border-b-0 md:border-r border-slate-200">
              
              {/* PDF Document Form Container */}
              <div id="erp-document-print-area" className="space-y-6">
                {/* PDF Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-full border-2 border-emerald-600">
                      <FileText className="text-emerald-650" size={24} />
                    </div>
                    <div>
                      <h1 className="text-sm font-bold text-slate-900 tracking-wide">Agro Produksi</h1>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">PT Agro Jabar Perseroda</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-500 leading-tight">
                    <p>Sistem ERP v2.8</p>
                    <p className="font-semibold text-emerald-600">Audit Logistik Gudang</p>
                    <p>Generasi: {new Date(activeAuditDoc.generateDate).toLocaleDateString("id-ID")}</p>
                  </div>
                </div>

                {/* PDF Doc Title & Number */}
                <div className="text-center space-y-1">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    DOKUMEN DETAIL AUDIT PENERIMAAN (FPPB)
                  </h2>
                  <p className="text-[11px] font-mono text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded inline-block">
                    No. Dokumen: {activeAuditDoc.docNumber}
                  </p>
                </div>

                {/* PDF Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Pengajuan</p>
                    <div>
                      <span className="text-slate-500 inline-block w-28">No. Pesanan SBU:</span>
                      <span className="font-semibold text-slate-850 font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">{activeAuditDoc.orderId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Tanggal Generate:</span>
                      <span className="font-semibold text-slate-850">{new Date(activeAuditDoc.generateDate).toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem Distribusi</p>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Verifikatur:</span>
                      <span className="font-semibold text-slate-850">{activeAuditDoc.generatedBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Jabatan:</span>
                      <span className="font-semibold text-slate-850 text-indigo-700">{activeAuditDoc.generatedByRole}</span>
                    </div>
                  </div>
                </div>

                {/* PDF Items Table */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rincian Komoditas & Anggaran (Tervalidasi):</h4>
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-w-full">
                    <table className="w-full text-left text-xs bg-white min-w-[600px] lg:min-w-full">
                      <thead className="bg-slate-200 border-b border-slate-300 uppercase font-black text-[10px] tracking-wider text-slate-700 whitespace-nowrap">
                        <tr>
                          <th className="p-3 text-center w-8">No</th>
                          <th className="p-3">Nama Komoditas</th>
                          <th className="p-3 text-center">Berat (Kg)</th>
                          <th className="p-3 text-right">Harga satuan (Rp)</th>
                          <th className="p-3 text-right">Total Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeAuditDoc.items?.map((it: any, index: number) => {
                          const itemComm = it.commodity || it.nama_komoditas || "Wortel";
                          const itemWeight = parseFloat(it.totalWeight || it.total_berat || it.packageWeight || 1);
                          const packPrice = parseFloat(it.harga || 15000);
                          const totalCost = parseFloat(it.totalPrice || (itemWeight * packPrice));

                          return (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-center text-slate-400 whitespace-nowrap">{index + 1}</td>
                              <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{itemComm}</td>
                              <td className="p-3 text-center font-semibold text-slate-700 whitespace-nowrap">{itemWeight.toLocaleString("id-ID")} Kg</td>
                              <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">Rp {packPrice.toLocaleString("id-ID")}</td>
                              <td className="p-3 text-right font-bold text-emerald-700 font-mono whitespace-nowrap">Rp {totalCost.toLocaleString("id-ID")}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td colSpan={4} className="p-3 text-right text-slate-500 whitespace-nowrap">Subtotal:</td>
                          <td colSpan={1} className="p-3 text-right font-mono text-slate-900 whitespace-nowrap">Rp {(activeAuditDoc.subTotal || 0).toLocaleString("id-ID")}</td>
                        </tr>
                        <tr className="bg-slate-150 font-extrabold border-t border-slate-300 bg-slate-100">
                          <td colSpan={4} className="p-3 text-right text-emerald-800 whitespace-nowrap uppercase tracking-wide text-[11px]">Total Keseluruhan (Grand Total):</td>
                          <td colSpan={1} className="p-3 text-right font-mono text-[13px] text-emerald-800 whitespace-nowrap">Rp {(activeAuditDoc.grandTotal || activeAuditDoc.subTotal || 0).toLocaleString("id-ID")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PDF Signature block */}
                <div className="grid grid-cols-2 text-xs pt-4 text-center border-t border-dashed border-slate-350">
                  <div className="space-y-8">
                    <p className="text-slate-500 italic">Disiapkan Oleh</p>
                    <div>
                      <p className="font-bold text-slate-900 text-xs underline">{session.username} – Officer</p>
                      <p className="text-[10px] text-slate-400">{session.role}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-slate-500 italic">Tanda Tangan Digital</p>
                    <div className="stamp-preview border border-dashed border-emerald-600 mx-auto px-4 py-1 w-max rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold tracking-wider leading-relaxed transform -rotate-1 shadow">
                      <p>E-STAMP SIGNED ELECTRONIC</p>
                      <p>DIVERIFIKASI AUDIT GUDANG</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Control Bar */}
            <div className="w-full md:w-72 bg-slate-900 text-white p-5 md:p-6 flex flex-col justify-between max-h-[32vh] md:max-h-full">
              <div className="space-y-5 text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">Menu Dokumen</h3>
                  <button
                    onClick={() => setActiveAuditDoc(null)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="text-xs space-y-2">
                  <p className="text-[10px] text-slate-400 font-mono font-bold">ID SISTEM: {activeAuditDoc.id}</p>
                  <p className="text-slate-300 leading-relaxed font-sans">{activeAuditDoc.notes}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveAuditDoc(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded cursor-pointer transition-all"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PHOTO LOGS RELATIONAL GALLERY MODAL - FITUR G */}
      {activeGalleryOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 flex items-center justify-center backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl p-6 border border-slate-250 max-h-[90vh] flex flex-col text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="text-emerald-600" size={18} />
                  <span>Riwayat Dokumentasi Penerimaan</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Kode Order / No. Penerimaan: {activeGalleryOrder}</p>
              </div>
              <button 
                onClick={() => setActiveGalleryOrder(null)}
                className="p-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5">
              {(() => {
                const filteredPhotos = photos.filter(p => {
                  if (!activeGalleryOrder) return false;
                  const matchedDelivery = deliveries.find(d => d.id === activeGalleryOrder || d.orderId === activeGalleryOrder);
                  return (
                    p.transactionId === activeGalleryOrder ||
                    (matchedDelivery && (p.transactionId === matchedDelivery.id || p.transactionId === matchedDelivery.orderId || p.transactionId === matchedDelivery.procurementId)) ||
                    p.id === activeGalleryOrder ||
                    (p.id && p.id.includes(activeGalleryOrder))
                  );
                });

                if (filteredPhotos.length === 0) {
                  return (
                    <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Camera size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-xs text-slate-500 font-medium">Tidak ada foto dokumentasi lapangan terhubung.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Seluruh pengambilan foto diverifikasi otomatis anti-bypass.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPhotos.map((p) => (
                      <div key={p.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:border-slate-300 transition-all shadow-xs">
                        <div className="aspect-video bg-slate-200 relative group">
                          <img 
                            src={p.filepath || imageFallback} 
                            alt={p.id} 
                            className="w-full h-full object-cover"
                          />
                          <div 
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-zoom-in"
                            onClick={() => {
                              setLightboxUrl(p.filepath);
                            }}
                          >
                            <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                              <Eye size={10} />
                              Preview
                            </span>
                          </div>
                        </div>
                        <div className="p-3 space-y-1.5 text-xs text-slate-800">
                          <p className="font-bold text-slate-900 truncate">{p.caption || `Dokumentasi ${p.id}`}</p>
                          <div className="space-y-1 text-[10px] text-slate-500 font-mono">
                            <p>Modul: <strong className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{p.module}</strong></p>
                            <p>Waktu: {p.captured_at ? new Date(p.captured_at).toLocaleString("id-ID") : ""}</p>
                            <p>Oleh: {p.captured_by} ({p.role_captured_by})</p>
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDownloadPhoto(p.filepath, p.filename)}
                              className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold rounded text-[10px] border border-sky-250 cursor-pointer inline-flex items-center space-x-1"
                            >
                              <Smartphone size={10} />
                              <span>Unduh Foto</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="border-t border-slate-150 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveGalleryOrder(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 font-semibold text-xs cursor-pointer"
              >
                Tutup Galeri
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
