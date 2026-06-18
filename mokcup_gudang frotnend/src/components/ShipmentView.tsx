import React, { useState, useEffect } from "react";
import { Truck, RotateCcw, Send, FileText, CheckCircle2, ChevronRight, Inbox, Printer, DollarSign, ArrowLeft } from "lucide-react";
import { SBUOrder, UserSession } from "../types";

interface ShipmentViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

export default function ShipmentView({
  session, setErrorNotification, setSuccessNotification, triggerRefreshStats
}: ShipmentViewProps) {
  const [orders, setOrders] = useState<SBUOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch fields
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [driverName, setDriverName] = useState("Asep Sunandar");
  const [vehicleNumber, setVehicleNumber] = useState("D 1902 FZ");

  // Selection for print visual overlay
  const [printingOrder, setPrintingOrder] = useState<SBUOrder | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (e) {
      setErrorNotification("Gagal melacak data pengiriman SBU.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDispatchShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setErrorNotification("Silakan tentukan order beku SBU rujukan!");
      return;
    }

    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          driverName,
          vehicleNumber,
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal mendaftarkan ekspedisi.");

      setSuccessNotification(`Gudang merilis order ${selectedOrderId}. Pengiriman aktif bersandi D-19 sedang dikirim!`);
      // Reset dispatch form
      setSelectedOrderId("");
      fetchOrders();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const handlePrintBAST = () => {
    window.print();
  };

  // Filter listings - include all non-shipped active/pending orders and sort descending so the newest is at the top
  const pendingShipmentOrders = [...orders]
    .filter(o => o.status !== "Dikirim" && o.status !== "Batal")
    .sort((a, b) => b.id.localeCompare(a.id));
  const activeShippedOrders = orders.filter(o => o.status === "Dikirim");

  if (printingOrder) {
    // Elegant A4 Print Preview Sheet (Anti-distortion print-media CSS styles)
    const priceRate = printingOrder.commodity === "Wortel" ? 25000 : printingOrder.commodity === "Buncis" ? 30000 : printingOrder.commodity === "Jagung Manis" ? 22000 : 28000;
    const itemTotalValue = printingOrder.totalWeight * priceRate;

    return (
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 print:bg-white print:p-0 print:border-none print:text-black">
        {/* Back button */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800 print:hidden text-xs">
          <button
            onClick={() => setPrintingOrder(null)}
            className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Kembat ke Pengiriman</span>
          </button>
          
          <button
            onClick={handlePrintBAST}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-955 font-bold flex items-center space-x-1 px-4 py-1.5 rounded cursor-pointer transition-all"
          >
            <Printer size={14} />
            <span>Cetak Dokumen Sekarang (Print/PDF)</span>
          </button>
        </div>

        {/* PRINT LAYOUT SHEET */}
        <div className="bg-white text-slate-900 p-8 rounded-xl max-w-3xl mx-auto shadow-2xl font-sans print:shadow-none print:border-none print:max-w-full">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div>
              <p className="text-xl font-black uppercase tracking-tight text-emerald-800">PT. FROZEN WEST VEGETABLES</p>
              <p className="text-xs text-slate-500 leading-normal max-w-sm font-sans">
                Kawasan Pergudangan Agro-Lembang No. 16, Kabupaten Bandung Barat, Jawa Barat.<br />
                Telp: (022) 827-1901 • Email: distribution@frozenwest.co.id
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">BERITA ACARA & INVOICE</p>
              <p className="text-lg font-mono font-extrabold text-slate-900">BAST-{printingOrder.id}</p>
              <p className="text-xs text-slate-500">Tanggal: {new Date().toLocaleDateString("id-ID")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mt-6 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">PIHAK I (YANG MENYERAHKAN - GUDANG):</p>
              <p className="font-bold text-slate-800">Gudang Lembang Cold Storage</p>
              <p className="text-slate-600">Diserahkan oleh: {session.fullName} ({session.role})</p>
              <p className="text-slate-500 text-[10px]">Kurir Pengirim: {driverName} | Truck: {vehicleNumber}</p>
            </div>
            
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">PIHAK II (YANG MENERIMA - CUSTOMER):</p>
              <p className="font-bold text-slate-800">SBU Bandung (Strategic Business Unit) Barat</p>
              <p className="text-slate-600">Diterima oleh: Manajer Logistik SBU Bandung</p>
              <p className="text-slate-500 text-[10px]">Alamat: Ritel Hub Pasteur No. 182-A, Dago, Kota Bandung.</p>
            </div>
          </div>

          {/* TABLE */}
          <div className="mt-8">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">DETAIL MUATAN BEKU DIKIRIM:</p>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-300">
                <tr>
                  <th className="p-2.5 border border-slate-300">Produk Komoditas</th>
                  <th className="p-2.5 border border-slate-300">Kemasan Ukuran</th>
                  <th className="p-2.5 border border-slate-300 text-center">Jumlah Satuan</th>
                  <th className="p-2.5 border border-slate-300 text-right">Berat Bersih (Kg)</th>
                  <th className="p-2.5 border border-slate-300 text-right">Harga Kontrak</th>
                  <th className="p-2.5 border border-slate-300 text-right">Subtotal Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 border border-slate-300 font-bold text-slate-850">{printingOrder.commodity}</td>
                  <td className="p-3 border border-slate-300 font-mono text-slate-600">{printingOrder.packaging} ({printingOrder.packageWeight} Kg)</td>
                  <td className="p-3 border border-slate-300 text-center font-bold">{printingOrder.quantity} Pack</td>
                  <td className="p-3 border border-slate-300 text-right font-bold text-slate-900">{printingOrder.totalWeight} Kg</td>
                  <td className="p-3 border border-slate-300 text-right font-mono text-slate-600">Rp {priceRate.toLocaleString("id-ID")}/Kg</td>
                  <td className="p-3 border border-slate-300 text-right font-bold text-emerald-800">Rp {itemTotalValue.toLocaleString("id-ID")}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="p-3 border border-slate-300 text-right uppercase text-[10px] text-slate-500">Nilai invoice ditagihkan:</td>
                  <td colSpan={2} className="p-3 border border-slate-300 text-right font-mono text-emerald-800 text-sm">
                    Rp {itemTotalValue.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal mt-5 font-sans italic">
            *Pernyataan: Pada hari ini, barang-barang beku diatas telah diserahterimakan dalam suhu optimal freezer IQF -18 derajat Celsius dalam kondisi steril, tersegel vakum, and lolos audit fito sanitasi.
          </p>

          {/* SIGNATURES */}
          <div className="grid grid-cols-3 gap-6 text-center text-xs mt-12 font-sans pt-6 border-t border-slate-100">
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">PIHAK I (YANG MENYERAHKAN - WMS)</p>
              <div className="h-16 flex items-center justify-center italic text-slate-320 text-slate-400">Ttd Digital</div>
              <p className="font-bold text-slate-800">({session.fullName})</p>
              <p className="text-[10px] text-slate-500">{session.role}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">DRIVER EKSPEDISI</p>
              <div className="h-16 flex items-center justify-center italic text-slate-320 text-slate-400">Ttd Kurir</div>
              <p className="font-bold text-slate-800">({driverName})</p>
              <p className="text-[10px] text-slate-500">Armada plat {vehicleNumber}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">PIHAK II (YANG MENERIMA - SBU)</p>
              <div className="h-16 flex items-center justify-center font-mono text-slate-300">___________</div>
              <p className="font-bold text-slate-800">(___________________)</p>
              <p className="text-[10px] text-slate-500">Manajer Ritel Hub Bandung</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Truck className="text-emerald-400" size={20} />
          <span>Pengiriman Barang (Logistik SBU)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Modul dispatcing armada truk chiller dingin, invoice packing, dan cetak lembaran serah terima BAST resmi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DISPATCH INPUT CONSOLE (Fitur 9) */}
        {session.role === "Admin Gudang" && (
          <form onSubmit={handleDispatchShipment} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-emerald-450 text-emerald-400 font-mono text-xs uppercase tracking-wider pb-2 border-b border-slate-800">
                <Send size={15} />
                <span>Rilis Pengiriman Truk Dingin</span>
              </div>

              <div className="space-y-3.5 text-xs font-sans">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5 uppercase">Pilih Order Siap Kirim</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg outline-none font-medium"
                  >
                    <option value="">-- Hubungkan Order Batch --</option>
                    {pendingShipmentOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} - {o.commodity} ({o.totalWeight} Kg) [{o.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5 uppercase">Nama Sopir (Driver Chiller)</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5 uppercase">Plat No. Kendaraan Box</label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedOrderId === ""}
              className="mt-6 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Truck size={14} />
              <span>Rilis Dispatch Armada</span>
            </button>
          </form>
        )}

        {/* ACTIVE SHIPPED CONSOLE (BAST list) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-7 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest pb-1 border-b border-slate-800 mb-3">
              Cetak Dokumen BAST & Nota Invoice SBU ({activeShippedOrders.length})
            </h3>
            <p className="text-[11px] text-slate-450 text-slate-400 leading-normal mb-4 font-sans">
              Segera cetak Berita Acara Serah Terima (BAST) untuk diserahkan ke pengemudi sasis pendingin sebelum berangkat menuju ritel pusat Bandung.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {activeShippedOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox size={32} className="mx-auto text-slate-700/60 mb-2" />
                  <p className="text-xs text-slate-500">Tidak ada pengiriman dalam perjalanan ritel.</p>
                </div>
              ) : (
                activeShippedOrders.map((o) => (
                  <div key={o.id} className="p-3.5 bg-slate-955 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-mono font-bold text-emerald-400">EXPEDITION REF: {o.id}</p>
                      <p className="text-white font-bold">{o.commodity} • {o.totalWeight} Kg</p>
                      <p className="text-[10px] text-slate-500">Sopir: {driverName} | No Box: {vehicleNumber}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrintingOrder(o)}
                      className="bg-slate-950 border border-slate-800 text-teal-400 hover:text-teal-300 hover:border-teal-400/50 text-[10px] font-bold p-1.5 px-3 rounded cursor-pointer flex items-center space-x-1"
                    >
                      <FileText size={11} />
                      <span>Print BAST</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* FULL EXPORT LOGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-800 bg-slate-955 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Buku Log Muat & Pengiriman (Chiller Outward)</p>
          <button 
            onClick={fetchOrders}
            className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-300"
          >
            <RotateCcw size={10} />
            <span>Penyegaran</span>
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">Belum ada pengiriman terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-955 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="p-4">No. Order</th>
                  <th className="p-4 font-mono">Tanggal Transaksi</th>
                  <th className="p-4">Jenis Sayur</th>
                  <th className="p-4 text-center">Bungkus</th>
                  <th className="p-4 text-right">Berat Muatan</th>
                  <th className="p-4">Driver Ekspedisi</th>
                  <th className="p-4">Tipe Armada</th>
                  <th className="p-4">Rantai Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 divide-slate-800/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-emerald-400">{o.id}</td>
                    <td className="p-4 text-slate-405 text-slate-400 font-mono">{o.orderDate}</td>
                    <td className="p-4 font-semibold text-white">{o.commodity}</td>
                    <td className="p-4 text-center font-semibold text-slate-300">{o.quantity} Pack ({o.packaging})</td>
                    <td className="p-4 font-bold text-white text-right">{o.totalWeight.toLocaleString("id-ID")} Kg</td>
                    <td className="p-4 text-slate-300 font-medium">{o.status === "Dikirim" ? driverName : "Gudang Intern"}</td>
                    <td className="p-4 text-slate-450 font-mono text-slate-400">{o.status === "Dikirim" ? vehicleNumber : "-"}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        o.status === "Menunggu Konfirmasi"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : o.status === "Diproses"
                          ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                          : o.status === "Siap Produksi" || o.status === "Menunggu Produksi"
                          ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                          : o.status === "Selesai"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
