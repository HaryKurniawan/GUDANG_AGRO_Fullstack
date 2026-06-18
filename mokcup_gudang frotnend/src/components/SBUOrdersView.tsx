import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Plus, 
  Inbox, 
  RotateCcw, 
  TrendingUp, 
  Trash, 
  X, 
  ShoppingBag, 
  Printer, 
  Download, 
  FileText, 
  Eye, 
  Calendar, 
  MapPin, 
  User, 
  ChevronRight, 
  RefreshCw,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { SBUOrder, UserSession, CommodityType, OrderStatus } from "../types";

interface SBUOrdersViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

const mapStatusToProfessional = (status: string) => {
  if (!status) return "";
  const s = status.trim();
  if (s === "Draft" || s === "Menunggu Konfirmasi" || s === "Menunggu" || s === "Pesanan Diterima") return "Pesanan Diterima";
  if (s === "Disetujui" || s === "Diproses" || s === "Pesanan Sedang Diproses") return "Pesanan Sedang Diproses";
  if (s === "Siap Produksi" || s === "Selesai Produksi" || s === "Menunggu Produksi" || s === "Siap" || s === "Pesanan Telah Siap") return "Pesanan Telah Siap";
  if (s === "Dikirim" || s === "Dalam Pengiriman" || s === "Dikirim Truk Chiller" || s === "Pesanan Dalam Pengiriman") return "Pesanan Dalam Pengiriman";
  if (s === "Selesai" || s === "Pesanan Selesai") return "Pesanan Selesai";
  return status;
};

export default function SBUOrdersView({ session, setErrorNotification, setSuccessNotification, triggerRefreshStats }: SBUOrdersViewProps) {
  const [orders, setOrders] = useState<SBUOrder[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "documents">("orders");
  const [showAddForm, setShowAddForm] = useState(false);

  // Basket item inputs
  const [deliveryDate, setDeliveryDate] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityType>("Wortel");
  const [selectedVarPackaging, setSelectedVarPackaging] = useState("Vaccum Nylon Bag");
  const [selectedWeightType, setSelectedWeightType] = useState<"1 Kg" | "2.5 Kg" | "Custom">("1 Kg");
  const [customWeight, setCustomWeight] = useState("5.0");
  const [quantity, setQuantity] = useState("100");

  // Basket listing
  const [basketItems, setBasketItems] = useState<any[]>([]);

  // Selected document for preview modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [docNotesInput, setDocNotesInput] = useState("");
  const [docStatusInput, setDocStatusInput] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (e) {
      setErrorNotification("Gagal memanggil data order SBU");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      setDocuments(data);
    } catch (e) {
      console.error("Gagal memanggil arsip dokumen:", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDocuments();
  }, []);

  const handleAddToBasket = () => {
    const qtyVal = parseInt(quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setErrorNotification("Jumlah pesanan harus bilangan positif.");
      return;
    }

    let pWeight = 1.0;
    if (selectedWeightType === "2.5 Kg") pWeight = 2.5;
    else if (selectedWeightType === "Custom") {
      const parsed = parseFloat(customWeight);
      if (isNaN(parsed) || parsed <= 0) {
        setErrorNotification("Berat kemasan kustom tidak valid.");
        return;
      }
      if (parsed > 25.0) {
        setErrorNotification("Batas maksimal berat kemasan kustom adalah 25 Kg demi standar penangan beban!");
        return;
      }
      pWeight = parsed;
    }

    let itemLabel = "";
    if (selectedWeightType === "1 Kg") {
      itemLabel = "Kemasan 1 kg";
    } else if (selectedWeightType === "2.5 Kg") {
      itemLabel = "Kemasan 2.5 kg";
    } else {
      itemLabel = `Kemasan ${pWeight} kg`;
    }

    const newItem = {
      commodity: selectedCommodity,
      packaging: itemLabel,
      packageWeight: pWeight,
      quantity: qtyVal,
      totalWeight: pWeight * qtyVal
    };

    setBasketItems([...basketItems, newItem]);
    setSuccessNotification(`Berhasil menambahkan ${selectedCommodity} ke keranjang.`);
  };

  const handleRemoveFromBasket = (index: number) => {
    setBasketItems(basketItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDate) {
      setErrorNotification("Silakan tentukan Tanggal Pengiriman terlebih dahulu.");
      return;
    }

    // Validate deliveryDate: minimal H-2
    const todayStr = new Date().toISOString().split("T")[0]; // today: "2026-05-28"
    const [tYear, tMonth, tDay] = todayStr.split("-").map(Number);
    const todayReset = new Date(tYear, tMonth - 1, tDay);

    const [dYear, dMonth, dDay] = deliveryDate.split("-").map(Number);
    const deliveryReset = new Date(dYear, dMonth - 1, dDay);

    const diffTime = deliveryReset.getTime() - todayReset.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 2) {
      setErrorNotification("Pengiriman minimal H-2 dari tanggal pemesanan.");
      return;
    }

    if (basketItems.length === 0) {
      setErrorNotification("Keranjang Anda saksama kosong. Tambahkan minimal 1 item!");
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: basketItems,
          operator: { username: session.username, role: session.role },
          deliveryDate: deliveryDate
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan order.");
      }

      setSuccessNotification("Order Agro Produksi multiproduk berhasil didaftarkan ke antrean.");
      setBasketItems([]);
      setShowAddForm(false);
      fetchOrders();
      fetchDocuments();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Status handler
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal mutasi status order");

      setSuccessNotification(`Status order ${orderId} diubah menjadi ${nextStatus}`);
      
      // Sync document status as well if mapped
      const matchedDoc = documents.find(d => d.orderId === orderId);
      if (matchedDoc) {
        await fetch(`/api/documents/${matchedDoc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus === "Menunggu Konfirmasi" ? "Draft" : nextStatus,
            operator: { username: session.username, role: session.role }
          })
        });
      }

      fetchOrders();
      fetchDocuments();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const handleGenerateDocumentForOrder = async (orderId: string) => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          username: session.username,
          role: session.role,
          notes: "Mohon dikirimkan dalam kondisi beku suhu -18°C menggunakan kontainer berpendingin."
        })
      });

      if (!response.ok) throw new Error("Gagal menggenerate dokumen.");
      
      setSuccessNotification("Dokumen Form Permintaan resmi berhasil di-generate!");
      fetchDocuments();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const handleRegenerateDocument = async (docId: string) => {
    setIsRegenerating(true);
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: docStatusInput,
          notes: docNotesInput,
          operator: { username: session.username, role: session.role }
        })
      });

      if (!response.ok) throw new Error("Gagal meregenerasi dokumen.");
      const updatedDoc = await response.json();

      setSuccessNotification(`Dokumen ${updatedDoc.docNumber} berhasil diperbarui, sinkronisasi fungsional sukses!`);
      
      // Also sync order status if set here
      const mappedOrderId = updatedDoc.orderId;
      if (mappedOrderId) {
        let orderStatus: OrderStatus = "Draft" as any;
        if (docStatusInput === "Pesanan Diterima") orderStatus = "Menunggu Konfirmasi";
        else if (docStatusInput === "Pesanan Sedang Diproses") orderStatus = "Diproses";
        else if (docStatusInput === "Pesanan Telah Siap") orderStatus = "Siap Produksi";
        else if (docStatusInput === "Pesanan Dalam Pengiriman") orderStatus = "Dikirim";
        else if (docStatusInput === "Pesanan Selesai") orderStatus = "Selesai";

        if (orderStatus && orderStatus !== ("Draft" as any)) {
          await fetch(`/api/orders/${mappedOrderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: orderStatus,
              operator: { username: session.username, role: session.role }
            })
          });
        }
      }

      fetchOrders();
      fetchDocuments();
      setIsDocModalOpen(false);
      setSelectedDoc(null);
    } catch (err: any) {
      setErrorNotification(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus dokumen resmi ini dari arsip?")) {
      return;
    }
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: { username: session.username, role: session.role }
        })
      });

      if (!response.ok) throw new Error("Gagal menghapus dokumen.");

      setSuccessNotification("Dokumen resmi berhasil dihapus.");
      fetchDocuments();
      setIsDocModalOpen(false);
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Modern High-Contrast Invoice Print Method
  const handlePrintDocument = (doc: any) => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      setErrorNotification("Gagal membuka popup cetak. Pastikan pop-up diperbolehkan di browser Anda.");
      return;
    }

    const itemsRows = doc.items?.map((it: any, index: number) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 12px; font-family: monospace; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; font-weight: bold; color: #0f172a;">${it.commodity}</td>
        <td style="padding: 12px; text-align: center;">${it.quantity} Pack</td>
        <td style="padding: 12px; text-align: center;">${it.packaging.includes("Custom") ? "Custom " + it.packageWeight + "kg" : it.packaging}</td>
        <td style="padding: 12px; text-align: right; font-family: monospace;">Rp ${(it.harga || 15000).toLocaleString("id-ID")}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857; font-family: monospace;">Rp ${(it.totalPrice || (it.quantity * 15000)).toLocaleString("id-ID")}</td>
      </tr>
    `).join("") || "";

    const htmlContent = `
      <html>
        <head>
          <title>${doc.docNumber}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; }
              .no-print { display: none; }
            }
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; max-width: 850px; margin: 0 auto; }
            .header-layout { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 3px solid #0f766e; padding-bottom: 15px; }
            .sys-name { font-size: 24px; font-weight: 800; color: #0f765e; margin: 0; }
            .sys-tag { font-size: 10px; text-transform: uppercase; tracking-wider; color: #64748b; margin: 2px 0 0 0; }
            .doc-title { font-size: 20px; font-weight: 900; color: #0f766e; text-align: center; margin-top: 25px; text-transform: uppercase; letter-spacing: 0.5px; }
            .doc-number { font-size: 13px; font-family: monospace; text-align: center; color: #475569; margin: 5px 0 25px 0; font-weight: bold; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .info-card { width: 50%; vertical-align: top; padding: 12px; border: 1px solid #e2e8f1; background-color: #f8fafc; font-size: 12px; border-radius: 4px; }
            .table-erp { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #cbd5e1; font-size: 12px; }
            .table-erp th { background-color: #cbd5e1; color: #1e293b; font-weight: 800; padding: 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #94a3b8; }
            .badge { display: inline-block; padding: 3px 8px; font-size: 9px; font-weight: bold; border-radius: 4px; text-transform: uppercase; }
            .badge-draft { background-color: #fef3c7; color: #d97706; }
            .badge-approved { background-color: #d1fae5; color: #065f46; }
            .badge-processed { background-color: #dbeafe; color: #1e40af; }
            .badge-completed { background-color: #ecfdf5; color: #065f46; }
            .badge-shipped { background-color: #f3e8ff; color: #6b21a8; }
            .notes-card { border: 1px dashed #cbd5e1; background-color: #fcfcfc; padding: 12px; font-size: 11px; border-radius: 4px; margin-bottom: 30px; font-style: italic; }
            .btn-print { background-color: #0f766e; color: white; padding: 10px 18px; border: none; font-size: 13px; border-radius: 4px; font-weight: bold; cursor: pointer; float: right; }
            .footer-sig { width: 100%; margin-top: 50px; text-align: center; font-size: 12px; }
            .sig-block { width: 50%; display: inline-block; vertical-align: bottom; height: 110px; }
            .stamp { border: 2px dashed #0f766e; padding: 6px; display: inline-block; font-weight: bold; font-size: 10px; color: #0f766e; transform: rotate(-2deg); margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">Print Dokumen</button>
            <div style="clear: both; margin-bottom: 20px;"></div>
          </div>

          <table style="width: 100%;">
            <tr>
              <td style="width: 55px; vertical-align: middle;">
                <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </td>
              <td style="vertical-align: middle;">
                <div class="sys-name">Agro Produksi</div>
                <div class="sys-tag">Logistics Department &bull; PT Agro Jabar Perseroda</div>
              </td>
              <td style="text-align: right; font-size: 11px; font-family: monospace; color: #64748b;">
                TANGGAL PRINT: ${new Date().toLocaleString("id-ID")}<br>
                INSTANSI: PT AGRO JABAR PERSERODA
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 15px; border-bottom: 2px solid #5a5a5a; padding-bottom: 10px;"></div>

          <div class="doc-title">Form Permohonan Permintaan Barang</div>
          <div class="doc-number">Nomor Dokumen: ${doc.docNumber}</div>

          <table class="info-table">
            <tr>
              <td class="info-card" style="border-right: none;">
                <strong>INFORMASI PEMESAN:</strong><br><br>
                Tanggal Pengajuan: <strong>${doc.items?.[0] ? doc.generateDate.split("T")[0] : doc.tanggalDiterima}</strong><br>
                Estimasi Diterima: <strong>${doc.tanggalDiterima || doc.generateDate.split("T")[0]}</strong><br>
                Divisi Pemesan: <strong>${doc.divisi}</strong><br>
                Sistem Origin: <strong>Agro Produksi B2B SBU</strong>
              </td>
              <td class="info-card">
                <strong>DETAIL DISTRIBUSI:</strong><br><br>
                Alamat Pengiriman: <strong>${doc.alamat}</strong><br>
                Status Dokumen: 
                <span class="badge ${
                  mapStatusToProfessional(doc.status) === 'Pesanan Diterima' ? 'badge-draft' :
                  mapStatusToProfessional(doc.status) === 'Pesanan Sedang Diproses' ? 'badge-processed' :
                  mapStatusToProfessional(doc.status) === 'Pesanan Telah Siap' ? 'badge-approved' :
                  mapStatusToProfessional(doc.status) === 'Pesanan Selesai' ? 'badge-completed' : 'badge-shipped'
                }">${mapStatusToProfessional(doc.status)}</span><br>
                SBU Cabang: <strong>SBU Bandung Timur</strong>
              </td>
            </tr>
          </table>

          <table class="table-erp">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">No</th>
                <th style="text-align: left;">Nama Barang / Komoditas Jadi</th>
                <th style="text-align: center; width: 100px;">Qty (Packs)</th>
                <th style="text-align: center; width: 140px;">Jenis Kemasan</th>
                <th style="text-align: right; width: 120px;">Harga Unit</th>
                <th style="text-align: right; width: 130px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
                <td colspan="4" style="padding: 10px; text-align: right;">Sub Total:</td>
                <td colspan="2" style="padding: 10px; text-align: right; font-family: monospace;">Rp ${doc.subTotal.toLocaleString("id-ID")}</td>
              </tr>
              <tr style="background-color: #e2e8f0; font-weight: 900;">
                <td colspan="4" style="padding: 10px; text-align: right; color: #0f766e;">TOTAL KESELURUHAN ORDER:</td>
                <td colspan="2" style="padding: 10px; text-align: right; color: #0f766e; font-family: monospace; font-size: 14px;">Rp ${doc.grandTotal.toLocaleString("id-ID")}</td>
              </tr>
              <tr style="background-color: #f8fafc; font-size: 11px;">
                <td colspan="4" style="padding: 8px; text-align: right; color: #64748b;">Rincian Volume Item:</td>
                <td colspan="2" style="padding: 8px; text-align: right; font-family: monospace; color: #64748b;">${doc.totalQty} Pack Tersegel</td>
              </tr>
            </tbody>
          </table>

          <div class="notes-card">
            <strong>CATATAN PERMINTAAN RESMI:</strong><br>
            "${doc.notes || 'Mohon dikirimkan dalam kondisi beku suhu -18C.'}"
          </div>

          <div class="footer-sig">
            <div class="sig-block">
              Disetujui Oleh,<br><br><br><br>
              <strong>Dodo Suhendar – Plt Direktur</strong><br>
              <span style="color: #64748b; font-size: 11px;">Otorisasi Direksi PT Agro Jabar Perseroda</span>
            </div>
            
            <div class="sig-block">
              Otorisasi & Gudang,<br>
              <div class="stamp">DIVERIFIKASI GUDANG</div><br><br>
              <strong>PT Agro Jabar Perseroda</strong><br>
              <span style="color: #64748b; font-size: 11px;">Digital Approved Verification</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const handleDownloadPdfFile = (doc: any) => {
    const cleanContent = `==========================================================\n` +
                          `               FORM PERMOHONAN PERMINTAAN BARANG           \n` +
                          `                        AGRO PRODUKSI                     \n` +
                          `==========================================================\n\n` +
                          `NOMOR DOKUMEN   : ${doc.docNumber}\n` +
                          `ORDER ID        : ${doc.orderId}\n` +
                          `TANGGAL PESAN   : ${doc.items?.[0] ? doc.generateDate.split("T")[0] : doc.tanggalDiterima}\n` +
                          `STATUS ORDER    : ${mapStatusToProfessional(doc.status)}\n` +
                          `DIVISI PEMESAN  : ${doc.divisi}\n` +
                          `ALAMAT KIRIM    : ${doc.alamat}\n` +
                          `TANGGAL CETAK   : ${new Date().toLocaleString("id-ID")}\n` +
                          `PETUGAS CETAK   : ${doc.generatedBy} (${doc.generatedByRole})\n\n` +
                          `----------------------------------------------------------\n` +
                          `DETAIL PERMINTAAN BARANG:\n` +
                          `----------------------------------------------------------\n` +
                          (doc.items?.map((it: any, i: number) => 
                            `${i + 1}. [${it.commodity}] Kemasan: ${it.packaging} | Qty: ${it.quantity} | @ Rp ${it.harga.toLocaleString("id-ID")} | Total: Rp ${it.totalPrice.toLocaleString("id-ID")} (${it.totalWeight} Kg)`
                          ).join("\n") || "") + "\n" +
                          `----------------------------------------------------------\n` +
                          `TOTAL ITEM      : ${doc.totalQty} Item Pack\n` +
                          `SUB TOTAL       : Rp ${doc.subTotal.toLocaleString("id-ID")}\n` +
                          `GRAND TOTAL     : Rp ${doc.grandTotal.toLocaleString("id-ID")}\n` +
                          `==========================================================\n\n` +
                          `CATATAN TAMBAHAN:\n` +
                          `"${doc.notes}"\n\n` +
                          `TANDA TANGAN OTORISASI:\n` +
                          `Digitally Stamp Certified: [PT Agro Jabar Perseroda]\n` +
                          `Date Signed: ${doc.generateDate}\n`;

    const blob = new Blob([cleanContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FPPB_${doc.docNumber.replace(/\//g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessNotification(`Dokumen permohonan ${doc.docNumber} terunduh sebagai Dokumen Digital (.txt)!`);
  };

  // Computations
  const totalVolumePerCommodity = orders.reduce((acc: Record<string, number>, curr) => {
    if (curr.items && curr.items.length > 0) {
      curr.items.forEach((it) => {
        acc[it.commodity] = (acc[it.commodity] || 0) + it.totalWeight;
      });
    } else {
      acc[curr.commodity] = (acc[curr.commodity] || 0) + curr.totalWeight;
    }
    return acc;
  }, {});

  const totalBatchOverallWeight = orders.reduce((acc, curr) => acc + curr.totalWeight, 0);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <ShoppingCart className="text-emerald-600" size={20} />
            <span>Permintaan & Dokumen SBU Bandung</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Modul sales invoice SBU Bandung terpadu dengan auto-generate Form Permohonan Permintaan Barang (PDF).
          </p>
        </div>

        {session.role === "Admin Gudang" && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs rounded-lg shadow-md transition-colors cursor-pointer"
          >
            {showAddForm ? <X size={15} /> : <Plus size={15} />}
            <span>{showAddForm ? "Tutup Form" : "Tambah Permintaan Baru"}</span>
          </button>
        )}
      </div>

      {/* Aggregate Volume Analytics bar */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center space-x-1.5">
          <TrendingUp size={13} className="text-emerald-600" />
          <span>Kebutuhan Komoditas SBU Bandung</span>
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-205">
            <p className="text-[9px] text-slate-400 uppercase font-semibold">Total Berat Sayuran</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{totalBatchOverallWeight.toLocaleString("id-ID")} Kg</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-205">
            <p className="text-[9px] text-orange-600 uppercase font-semibold">Total Wortel</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{(totalVolumePerCommodity["Wortel"] || 0).toLocaleString("id-ID")} Kg</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-205">
            <p className="text-[9px] text-emerald-600 uppercase font-semibold">Total Buncis</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{(totalVolumePerCommodity["Buncis"] || 0).toLocaleString("id-ID")} Kg</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-205">
            <p className="text-[9px] text-amber-600 uppercase font-semibold">Total Jagung Manis</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{(totalVolumePerCommodity["Jagung Manis"] || 0).toLocaleString("id-ID")} Kg</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-205">
            <p className="text-[9px] text-blue-600 uppercase font-semibold">Total Sayuran Mix</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{(totalVolumePerCommodity["Sayuran Mix"] || 0).toLocaleString("id-ID")} Kg</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - ERP Integration */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === "orders"
              ? "bg-white text-slate-800 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <ShoppingCart size={13} />
            <span>Antrean Order SBU ({orders.length})</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === "documents"
              ? "bg-white text-slate-800 shadow-xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <FileText size={13} className="text-emerald-500" />
            <span>📄 Arsip Dokumen FPPB ({documents.length})</span>
          </span>
        </button>
      </div>

      {/* Tab Content 1: Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Conditional Create Form */}
          {showAddForm && (
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={14} className="text-emerald-600" />
                  <span>Pembuatan Order Baru SBU Bandung</span>
                </h3>
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">Auto-Generate PDF Enabled</span>
              </div>

              {/* Tanggal Pengiriman Input */}
              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1 uppercase tracking-wide">Tanggal Pengiriman (Minimal H-2)</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeliveryDate(val);
                      if (val) {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const [tYear, tMonth, tDay] = todayStr.split("-").map(Number);
                        const todayReset = new Date(tYear, tMonth - 1, tDay);

                        const [dYear, dMonth, dDay] = val.split("-").map(Number);
                        const deliveryReset = new Date(dYear, dMonth - 1, dDay);

                        const diffTime = deliveryReset.getTime() - todayReset.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 2) {
                          setErrorNotification("Pengiriman minimal H-2 dari tanggal pemesanan.");
                        }
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-white border border-emerald-200 text-slate-800 rounded-lg outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">Sesuai peraturan, pesanan tidak bisa dikirim di hari yang sama atau H-1.</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-205 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Komoditas Vegetable</label>
                  <select
                    value={selectedCommodity}
                    onChange={(e) => setSelectedCommodity(e.target.value as CommodityType)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 text-slate-800 rounded outline-none focus:border-emerald-500"
                  >
                    <option value="Wortel">Wortel (Carrot IQF)</option>
                    <option value="Buncis">Buncis (French Beans IQF)</option>
                    <option value="Jagung Manis">Jagung Manis (Sweet Corn IQF)</option>
                    <option value="Sayuran Mix">Sayuran Mix (Mixed Frozen Vegetable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Kategori Berat</label>
                  <select
                    value={selectedWeightType}
                    onChange={(e) => setSelectedWeightType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 text-slate-800 rounded outline-none focus:border-emerald-500"
                  >
                    <option value="1 Kg">1 Kg Standard</option>
                    <option value="2.5 Kg">2.5 Kg Standard</option>
                    <option value="Custom">Custom (Fleksibel Max 25 Kg)</option>
                  </select>
                </div>

                {selectedWeightType === "Custom" && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Berat Kustom (Kg, Max 25)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="25"
                      value={customWeight}
                      onChange={(e) => setCustomWeight(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 text-slate-800 rounded focus:outline-none focus:border-emerald-500"
                      placeholder="Maks 25.0 kg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Jumlah Pesan (Pack)</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 text-slate-800 rounded focus:outline-none focus:border-emerald-500"
                    placeholder="cth: 100"
                  />
                </div>

                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddToBasket}
                    className="w-full text-xs px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Plus size={14} />
                    <span>Tambah Basket</span>
                  </button>
                </div>
              </div>

              {/* Current Basket Items Table */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Daftar Sayur Terpilih ({basketItems.length})
                </h4>

                {basketItems.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-400 italic">Belum ada komoditas di keranjang. Gunakan panel di atas untuk menambah.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs bg-white">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-[10px] uppercase font-bold text-slate-500">No</th>
                          <th className="p-2.5 text-[10px] uppercase font-bold text-slate-500">Komoditas</th>
                          <th className="p-2.5 text-[10px] uppercase font-bold text-slate-500">Kemasan & Ukuran</th>
                          <th className="p-2.5 text-[10px] uppercase font-bold text-slate-500">Berat Kemasan</th>
                          <th className="p-2.5 text-[10px] uppercase font-bold text-slate-500">Jumlah Order</th>
                          <th className="p-2.5 text-[10px] uppercase font-bold text-slate-500">Total Berat</th>
                          <th className="p-2.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {basketItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/70">
                            <td className="p-2.5 font-mono text-slate-400">{index + 1}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{item.commodity}</td>
                            <td className="p-2.5 text-slate-600">{item.packaging}</td>
                            <td className="p-2.5 font-mono text-slate-600">{item.packageWeight} Kg</td>
                            <td className="p-2.5 font-semibold text-slate-700">{item.quantity.toLocaleString("id-ID")} Pack</td>
                            <td className="p-2.5 font-bold text-emerald-600">{(item.packageWeight * item.quantity).toLocaleString("id-ID")} Kg</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromBasket(index)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title="Hapus"
                              >
                                <Trash size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setBasketItems([]);
                    setShowAddForm(false);
                  }}
                  className="text-xs px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={basketItems.length === 0}
                  className="text-xs px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white rounded transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <span>Submit & Generate FPPB PDF Otomatis</span>
                </button>
              </div>
            </div>
          )}

          {/* SBU Orders Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Antrean Permintaan SBU Terdaftar</p>
              <button 
                onClick={fetchOrders}
                className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-700 hover:underline"
              >
                <RotateCcw size={10} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Menghubungkan ke API...</div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Belum ada order dari SBU Bandung.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">No. Order</th>
                      <th className="p-4">Tanggal Masuk</th>
                      <th className="p-4">Sayuran & Detail Kemas</th>
                      <th className="p-4">Total Pack</th>
                      <th className="p-4">Volume Bersih</th>
                      <th className="p-4">Dokumen Resmi (Auto FPPB)</th>
                      <th className="p-4">Status</th>
                      {session.role === "Admin Gudang" && <th className="p-3 text-right">Aksi Gudang</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => {
                      const relatedDoc = documents.find(doc => doc.orderId === o.id);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <div className="font-mono font-bold text-emerald-600">{o.id}</div>
                            {o.source && (
                              <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded mt-1 font-semibold ${
                                o.source.includes("Shopee") 
                                  ? "bg-orange-50 text-orange-600 border border-orange-200"
                                  : o.source.includes("Tokopedia")
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : o.source.includes("Web")
                                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {o.source || "B2B SBU"}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-600">{o.orderDate}</td>
                          <td className="p-4">
                            {o.customer && (
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                SBU Divisi: {o.customer}
                              </div>
                            )}
                            <div className="font-semibold text-slate-800">{o.commodity}</div>
                            {o.items && o.items.length > 0 ? (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {o.items.map((it, idx) => (
                                  <span key={idx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                                    {it.commodity} ({it.packaging.includes("Custom") ? "Custom " + it.packageWeight + "kg" : it.packaging}) x{it.quantity}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Pesanan warisan (Single-Commodity)</span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-slate-700">{o.quantity.toLocaleString("id-ID")}</td>
                          <td className="p-4 font-bold text-slate-800">{o.totalWeight.toLocaleString("id-ID")} Kg</td>
                          <td className="p-4">
                            {relatedDoc ? (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDoc(relatedDoc);
                                    setDocNotesInput(relatedDoc.notes);
                                    setDocStatusInput(relatedDoc.status);
                                    setIsDocModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-205 rounded font-mono text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <FileCheck size={11} className="text-emerald-600 animate-pulse" />
                                  <span>{relatedDoc.docNumber}</span>
                                </button>
                                <div className="flex gap-1.5 pl-1">
                                  <button
                                    onClick={() => handlePrintDocument(relatedDoc)}
                                    className="text-[9px] text-slate-500 hover:text-slate-800 cursor-pointer"
                                    title="Print Langsung"
                                  >
                                    Cetak
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    onClick={() => handleDownloadPdfFile(relatedDoc)}
                                    className="text-[9px] text-slate-500 hover:text-slate-800 cursor-pointer"
                                    title="Download PDF"
                                  >
                                    Unduh FPPB
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateDocumentForOrder(o.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[10px] text-slate-600 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={11} />
                                <span>Generate FPPB</span>
                              </button>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border ${
                              o.status === "Menunggu Konfirmasi"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : o.status === "Pesanan Diterima"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                                : o.status === "Diproses"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : o.status === "Siap Produksi" || o.status === "Menunggu Produksi"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : o.status === "Selesai"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          {session.role === "Admin Gudang" && (
                            <td className="p-3 text-right whitespace-nowrap space-x-1">
                              {o.status === "Menunggu Konfirmasi" && (
                                <button
                                  onClick={() => handleUpdateStatus(o.id, "Pesanan Diterima")}
                                  className="bg-emerald-55 border border-emerald-300 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                                >
                                  Terima Pesanan
                                </button>
                              )}
                              {o.status === "Pesanan Diterima" && (
                                <button
                                  onClick={() => handleUpdateStatus(o.id, "Diproses")}
                                  className="bg-blue-55 border border-blue-300 text-blue-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-100 transition-all cursor-pointer"
                                >
                                  Proses Pesanan
                                </button>
                              )}
                              {o.status === "Diproses" && (
                                <button
                                  onClick={() => handleUpdateStatus(o.id, "Siap Produksi")}
                                  className="bg-blue-50 border border-blue-300 text-blue-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-100 transition-all cursor-pointer"
                                >
                                  Siap Produksi
                                </button>
                              )}
                              {(o.status === "Siap Produksi" || o.status === "Menunggu Produksi") && (
                                <button
                                  onClick={() => handleUpdateStatus(o.id, "Selesai")}
                                  className="bg-emerald-50 border border-emerald-300 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                                >
                                  Selesaikan
                                </button>
                              )}
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
        </div>
      )}

      {/* Tab Content 2: Official PDF Documents Archive Tab */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arsip & Dokumen Gudang</p>
              <p className="text-[11px] text-slate-500">Mencakup semua Surat Permintaan / Form Permohonan Barang (FPPB) yang ter-generate resmi.</p>
            </div>
            <button
              onClick={fetchDocuments}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Refresh Arsip</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {documents.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">Belum ada arsip dokumen resmi di database.</p>
                <p className="text-[10px] text-slate-400 mt-1">Gunakan tombol Generate FPPB di tab order SBU untuk membuat dokumen.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">No. Dokumen</th>
                      <th className="p-4">Relasi Order</th>
                      <th className="p-4">Tanggal Generate</th>
                      <th className="p-4">User Pembuat</th>
                      <th className="p-4">Volume & Total Belanja</th>
                      <th className="p-4">Status Dokumen</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-mono font-bold text-slate-800">
                          {doc.docNumber}
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {doc.orderId}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {new Date(doc.generateDate).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-700">{doc.generatedBy}</div>
                          <div className="text-[9px] text-slate-500">{doc.generatedByRole}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-900">Rp {(doc.subTotal || 0).toLocaleString("id-ID")}</div>
                          <div className="text-[10px] text-slate-500">{(doc.totalQty || 0)} Pack total</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            doc.status === "Draft" || doc.status === "Menunggu Konfirmasi"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : doc.status === "Disetujui"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : doc.status === "Diproses"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : doc.status === "Selesai"
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setDocNotesInput(doc.notes);
                                setDocStatusInput(doc.status);
                                setIsDocModalOpen(true);
                              }}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                              title="Buka Pratinjau Modal"
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => handlePrintDocument(doc)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                              title="Cetak/Print Langsung"
                            >
                              <Printer size={12} />
                            </button>
                            <button
                              onClick={() => handleDownloadPdfFile(doc)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-emerald-600 cursor-pointer"
                              title="Download .txt copy"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN/MODAL PREVIEW ERP DOCUMENT "Form Permohonan Permintaan Barang Gudang" */}
      {isDocModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 md:p-4 flex items-start md:items-center justify-center backdrop-blur-xs font-sans">
          <div className="relative bg-slate-100 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-300 max-h-[92vh] md:max-h-[85vh]">
            
            {/* Left: Document View Sheet (Styled beautifully to represent A4 ERP Paper) */}
            <div className="flex-1 p-5 md:p-8 bg-white overflow-y-auto max-h-[58vh] md:max-h-full text-slate-800 text-left border-b md:border-b-0 md:border-r border-slate-200">
              
              {/* PDF Document Form Container */}
              <div id="erp-document-print-area" className="space-y-6">
                {/* PDF Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-full border-2 border-emerald-600">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-sm font-bold text-slate-900 tracking-wide">Agro Produksi</h1>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">PT Agro Jabar Perseroda</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-500 leading-tight">
                    <p>Sistem v2.8</p>
                    <p className="font-semibold text-emerald-600">PT Agro Jabar Perseroda</p>
                    <p>Cetak: {new Date(selectedDoc.generateDate).toLocaleDateString("id-ID")}</p>
                  </div>
                </div>

                {/* PDF Doc Title & Number */}
                <div className="text-center space-y-1">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    FORM PERMOHONAN PERMINTAAN BARANG
                  </h2>
                  <p className="text-[11px] font-mono text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded inline-block">
                    No. Dokumen: {selectedDoc.docNumber}
                  </p>
                </div>

                {/* PDF Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Pengajuan</p>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Tanggal Pesan:</span>
                      <span className="font-semibold text-slate-850">{selectedDoc.items?.[0] ? selectedDoc.generateDate.split("T")[0] : selectedDoc.tanggalDiterima}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Estimasi Diterima:</span>
                      <span className="font-semibold text-slate-850">{selectedDoc.tanggalDiterima || selectedDoc.generateDate.split("T")[0]}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Divisi Pemesan:</span>
                      <span className="font-semibold text-slate-850">{selectedDoc.divisi}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem Distribusi</p>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Alamat Kirim:</span>
                      <span className="font-semibold text-slate-850">{selectedDoc.alamat}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 inline-block w-28">Status Order:</span>
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono bg-emerald-100 text-emerald-800">
                        {mapStatusToProfessional(selectedDoc.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PDF Items Table */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rincian Barang Diproses:</h4>
                  <div className="border border-slate-300 rounded-lg overflow-x-auto max-w-full">
                    <table className="w-full text-left text-xs bg-white min-w-[650px] lg:min-w-full">
                      <thead className="bg-slate-200 border-b border-slate-300 uppercase font-black text-[10px] tracking-wider text-slate-700 whitespace-nowrap">
                        <tr>
                          <th className="p-3 text-center w-8">No</th>
                          <th className="p-3">Nama Barang</th>
                          <th className="p-3 text-center">Qty (Pack)</th>
                          <th className="p-3 text-center">Jenis Kemasan</th>
                          <th className="p-3 text-right">Harga</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedDoc.items?.map((it: any, index: number) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-center text-slate-400 whitespace-nowrap">{index + 1}</td>
                            <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{it.commodity}</td>
                            <td className="p-3 font-semibold text-center text-slate-755 whitespace-nowrap">{it.quantity} Pack</td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {it.packaging.includes("1kg/2.5kg Standar") || it.packaging === "1kg/2.5kg Standar"
                                ? `Kemasan ${it.packageWeight} kg`
                                : it.packaging}
                            </td>
                            <td className="p-3 text-right font-mono whitespace-nowrap">Rp {(it.harga || 15000).toLocaleString("id-ID")}</td>
                            <td className="p-3 text-right font-bold text-teal-700 font-mono whitespace-nowrap">Rp {(it.totalPrice || (it.quantity * 15005)).toLocaleString("id-ID")}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border-t border-slate-300">
                          <td colSpan={4} className="p-3 text-right text-slate-500 whitespace-nowrap">Sub Total:</td>
                          <td colSpan={2} className="p-3 text-right font-mono text-slate-900 whitespace-nowrap">Rp {(selectedDoc.subTotal || 0).toLocaleString("id-ID")}</td>
                        </tr>
                        <tr className="bg-slate-100 font-bold border-t border-slate-300">
                          <td colSpan={4} className="p-3 text-right text-emerald-800 whitespace-nowrap">Total Keseluruhan Order:</td>
                          <td colSpan={2} className="p-3 text-right font-mono text-[13px] text-emerald-800 whitespace-nowrap">Rp {(selectedDoc.grandTotal || 0).toLocaleString("id-ID")}</td>
                        </tr>
                        <tr className="bg-slate-50 text-[10px] leading-none text-slate-500 font-mono font-semibold">
                          <td colSpan={4} className="p-2 text-right whitespace-nowrap">Total Item Order:</td>
                          <td colSpan={2} className="p-2 text-right whitespace-nowrap">{(selectedDoc.totalQty || 0)} Pack</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PDF Footer Notes */}
                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-1">Catatan Tambahan:</p>
                  <p className="italic text-slate-755 font-serif">&ldquo;{selectedDoc.notes || "Mohon dikirimkan dalam kondisi beku suhu -18°C menggunakan kontainer berpendingin."}&rdquo;</p>
                </div>

                {/* PDF Signature block */}
                <div className="grid grid-cols-2 text-xs pt-6 text-center border-t border-dashed border-slate-350">
                  <div className="space-y-12">
                    <p className="text-slate-600">Disetujui Oleh,</p>
                    <div>
                      <p className="font-bold text-slate-900 text-xs underline">Dodo Suhendar – Plt Direktur</p>
                      <p className="text-[10px] text-slate-400">Direksi PT Agro Jabar Perseroda</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-slate-600 text-xs">Tanda Tangan Digital/Divisi,</p>
                    <div className="stamp-preview border border-dashed border-emerald-600 mx-auto px-4 py-2 w-max rounded-lg bg-emerald-50 text-emerald-800 text-[9px] font-bold tracking-wider leading-relaxed transform -rotate-1 shadow-md">
                      <p>E-STAMP SIGNED ELECTRONIC</p>
                      <p>DIVERIFIKASI GUDANG AGRO</p>
                      <p className="font-mono text-[8px] text-slate-500 leading-none mt-1">TS: {selectedDoc.generateDate.substring(0,16)}</p>
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-emerald-800">PT Agro Jabar Perseroda</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Controller Sidebar Panel (Re-generate, Sync Status, Printing Controls) */}
            <div className="w-full md:w-80 bg-slate-900 text-white p-5 md:p-6 flex flex-col justify-between max-h-[34vh] md:max-h-full overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`text-emerald-400 ${isRegenerating ? 'animate-spin' : ''}`} size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Kontrol Dokumen</span>
                  </div>
                  <button
                    onClick={() => setIsDocModalOpen(false)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400">NOMOR SISTEM</p>
                  <p className="text-xs font-mono font-bold text-emerald-400">{selectedDoc.id}</p>
                  <p className="text-[9px] text-slate-500 font-mono leading-relaxed truncate">PATH: {selectedDoc.pdfPath}</p>
                </div>

                {/* Edit & Re-generate section */}
                <div className="space-y-4 pt-3 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Re-Generate & Edit</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 font-bold">Status Dokumen</label>
                      <select
                        value={docStatusInput}
                        onChange={(e) => setDocStatusInput(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded outline-none focus:border-emerald-500"
                      >
                        <option value="Pesanan Diterima">Pesanan Diterima</option>
                        <option value="Pesanan Sedang Diproses">Pesanan Sedang Diproses</option>
                        <option value="Pesanan Telah Siap">Pesanan Telah Siap</option>
                        <option value="Pesanan Dalam Pengiriman">Pesanan Dalam Pengiriman</option>
                        <option value="Pesanan Selesai">Pesanan Selesai</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 font-bold">Catatan Permohonan</label>
                      <textarea
                        value={docNotesInput}
                        onChange={(e) => setDocNotesInput(e.target.value)}
                        rows={3}
                        className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded focus:outline-none focus:border-emerald-500 leading-relaxed"
                        placeholder="Ubah catatan tambahan permohonan..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRegenerateDocument(selectedDoc.id)}
                      disabled={isRegenerating}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 text-white disabled:opacity-40"
                    >
                      <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                      <span>{isRegenerating ? "Memproses..." : "Re-generate & Sinkronisasi"}</span>
                    </button>
                  </div>
                </div>

                {/* PDF Actions */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aksi Fisik Dokumen</p>
                  
                  <button
                    type="button"
                    onClick={() => handlePrintDocument(selectedDoc)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-350 cursor-pointer"
                  >
                    <Printer size={14} className="text-emerald-400" />
                    <span>Print Langsung (Browser)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdfFile(selectedDoc)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-350 cursor-pointer"
                  >
                    <Download size={14} className="text-emerald-400" />
                    <span>Unduh Dokumen Digital</span>
                  </button>
                </div>
              </div>

              {/* Delete Document option */}
              <div className="pt-6 border-t border-slate-800">
                {session.role === "Admin Gudang" && (
                  <button
                    onClick={() => handleDeleteDocument(selectedDoc.id)}
                    className="w-full py-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-900 text-rose-300 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash size={12} />
                    <span>Hapus Dokumen Arsip</span>
                  </button>
                )}
                <p className="text-[9px] text-slate-500 text-center mt-3 font-mono">Agro Produksi Logistik SBU Bandung</p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
