import React, { useState, useEffect } from "react";
import { Scale, RotateCcw, AlertTriangle, CheckSquare, Sparkles, Send, Edit3 } from "lucide-react";
import { FarmerDelivery, UserSession } from "../types";

interface TimbangUlangViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

export default function TimbangUlangView({
  session, setErrorNotification, setSuccessNotification, triggerRefreshStats
}: TimbangUlangViewProps) {
  const [deliveries, setDeliveries] = useState<FarmerDelivery[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Scale Action State
  const [selectedDelivery, setSelectedDelivery] = useState<FarmerDelivery | null>(null);
  const [warehouseScale, setWarehouseScale] = useState("");
  const [scaleNotes, setScaleNotes] = useState("");

  // Correction Action State
  const [resolvingShortageId, setResolvingShortageId] = useState<string | null>(null);
  const [resolvedDiffWeight, setResolvedDiffWeight] = useState("");

  const fetchValidations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/deliveries");
      const data = await response.json();
      setDeliveries(data);

      const procResponse = await fetch("/api/procurements");
      const procData = await procResponse.json();
      setProcurements(procData || []);
    } catch (e) {
      setErrorNotification("Gagal membaca timbangan gudang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidations();
  }, []);

  const selectForScaling = (deliv: FarmerDelivery) => {
    setSelectedDelivery(deliv);
    setWarehouseScale(String(deliv.sentWeight));
    setScaleNotes(`Produk ${deliv.commodity} telah diletakkan di jembatan timbang digital pintu 2.`);
  };

  const handlePostScale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    const scaleVal = parseFloat(warehouseScale);
    if (isNaN(scaleVal) || scaleVal <= 0) {
      setErrorNotification("Bobot timbang ulang harus valid.");
      return;
    }

    try {
      const response = await fetch(`/api/deliveries/${selectedDelivery.id}/scale`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaledWeightWarehouse: scaleVal,
          scaleNotes,
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal mengunci jembatan timbangan.");

      setSuccessNotification(`Hasil timbangkan ulang untuk ${selectedDelivery.id} berhasil terverifikasi.`);
      setSelectedDelivery(null);
      fetchValidations();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const handleResolveShortfall = async () => {
    if (!resolvingShortageId) return;
    const resolvedWeight = parseFloat(resolvedDiffWeight);
    if (isNaN(resolvedWeight) || resolvedWeight <= 0) {
      setErrorNotification("Berat akhir koreksi harus valid.");
      return;
    }

    try {
      const response = await fetch(`/api/deliveries/${resolvingShortageId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolvedWeight,
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal menetapkan koreksi.");

      setSuccessNotification(`Kekurangan pasokan ${resolvingShortageId} telah dipenuhi oleh petani.`);
      setResolvingShortageId(null);
      setResolvedDiffWeight("");
      fetchValidations();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const pendingScalingList = deliveries.filter(d => d.scaledWeightWarehouse === undefined);
  const validatedScalingList = deliveries.filter(d => d.scaledWeightWarehouse !== undefined);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Scale className="text-emerald-400" size={20} />
          <span>Validasi Timbang Ulang (Jembatan Timbangan)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Penyelarasan bobot surat jalan petani dengan timbangan presisi cold storage guna menetapkan kelayakan bayar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SCALING INPUT CONSOLE (Fitur 6) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest pb-2 border-b border-slate-800 flex items-center space-x-1.5 mb-4">
              <Sparkles size={14} className="text-emerald-400" />
              <span>Input Jembatan Timbang Digital</span>
            </h3>

            {selectedDelivery ? (
              <form onSubmit={handlePostScale} className="space-y-4">
                <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs text-left">
                  {(() => {
                    const dOrderId = selectedDelivery.orderId || (() => {
                      const matchedProc = procurements.find(p => p.id === selectedDelivery.procurementId);
                      return matchedProc ? matchedProc.orderId : "";
                    })() || "Kustom / Mandiri";
                    return (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">No. Order SBU:</span>
                        <span className="font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-900/60 px-2 py-0.5 rounded font-bold text-[11px]">
                          {dOrderId}
                        </span>
                      </div>
                    );
                  })()}
                  <p className="text-slate-400 font-mono">Surat Jalan: <span className="text-emerald-400 font-bold">{selectedDelivery.id}</span></p>
                  <p className="text-white font-semibold">Petani: {selectedDelivery.farmerName}</p>
                  <p className="text-slate-300">Komoditas: {selectedDelivery.commodity} (Kirim: <span className="font-bold text-slate-200">{selectedDelivery.sentWeight} Kg</span>)</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1.5 uppercase">Hasil Timbang Gudang (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={warehouseScale}
                      onChange={(e) => setWarehouseScale(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg outline-none font-bold text-center text-lg focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1.5 uppercase">Catatan Bukti Selisih</label>
                    <input
                      type="text"
                      value={scaleNotes}
                      onChange={(e) => setScaleNotes(e.target.value)}
                      placeholder="Cth: Hasil pas karena kemasan kering..."
                      className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* Instant validation logic display info */}
                {warehouseScale && (
                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg font-mono text-[11px]">
                    {parseFloat(warehouseScale) - selectedDelivery.sentWeight === 0 && (
                      <span className="text-emerald-400 flex items-center"><CheckSquare size={13} className="mr-1" /> VALID: Berat sesuai surat jalan.</span>
                    )}
                    {parseFloat(warehouseScale) - selectedDelivery.sentWeight > 0 && (
                      <span className="text-cyan-400 flex items-center"><AlertTriangle size={13} className="mr-1" /> SURPLUS: Kelebihan +{(parseFloat(warehouseScale) - selectedDelivery.sentWeight).toFixed(1)} Kg. Terkirim notifikasi retur tani!</span>
                    )}
                    {parseFloat(warehouseScale) - selectedDelivery.sentWeight < 0 && (
                      <span className="text-rose-450 text-rose-400 flex items-center"><AlertTriangle size={13} className="mr-1" /> DEFISIT: Kekurangan {(parseFloat(warehouseScale) - selectedDelivery.sentWeight).toFixed(1)} Kg. Terkirim notifikasi WhatsApp ke Kepala Tani!</span>
                    )}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDelivery(null)}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold shadow-md cursor-pointer text-center"
                  >
                    Simpan Timbangan (Kunci)
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-12 bg-slate-955 rounded-xl border border-slate-850 italic text-xs text-slate-500">
                Pilih salah satu truk kontainer masuk di tabel sebelah kanan untuk menimbang ulang muatan basah.
              </div>
            )}
          </div>

          {/* REALTIME deficiency resolution (Fitur 6) */}
          {resolvingShortageId && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-6 mt-4 space-y-4">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center space-x-1">
                <AlertTriangle size={14} />
                <span>Koreksi Pemenuhan Selisih (Kekurangan)</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Gunakan panel ini jika pihak petani telah mengirimkan susulan sayuran untuk kekurangan muatan {resolvingShortageId}.
              </p>
              
              <div className="flex space-x-3 text-xs">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">Berat Akhir Sesuai (Kg)</label>
                  <input
                    type="number"
                    value={resolvedDiffWeight}
                    onChange={(e) => setResolvedDiffWeight(e.target.value)}
                    placeholder="Masukkan berat akhir..."
                    className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleResolveShortfall}
                    className="bg-emerald-500 text-slate-950 text-xs font-bold p-2 px-4 rounded hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    Koreksi Data (Menjadi Sesuai)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE UNVALIDATED LIST (Tabel Timbang) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest pb-2 border-b border-slate-800">
            Antrean Truk Menunggu Validasi Timbang ({pendingScalingList.length})
          </h3>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {pendingScalingList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12 italic">Tidak ada truk menunggu timbangan.</p>
            ) : (
              pendingScalingList.map((d) => {
                const dOrderId = d.orderId || (() => {
                  const matchedProc = procurements.find(p => p.id === d.procurementId);
                  return matchedProc ? matchedProc.orderId : "";
                })() || "Kustom / Mandiri";

                return (
                  <div key={d.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between text-left">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-400">{d.id}</span>
                        <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-950 border border-cyan-900 px-1.5 py-0.2 rounded">
                          {dOrderId}
                        </span>
                      </div>
                      <p className="text-white font-semibold">{d.farmerName}</p>
                      <p className="text-slate-400 text-[11px]">{d.commodity} • Berat Kirim: <span className="font-bold text-slate-200">{d.sentWeight} Kg</span></p>
                    </div>
                    
                    <button
                      onClick={() => selectForScaling(d)}
                      className="p-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 hover:scale-103 text-slate-955 font-bold text-[10px] rounded transition-all cursor-pointer"
                    >
                      Timbang Muatan
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* VALIDATION HISTORY WITH ACTIONS FOR CORRECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-955">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Histori Deteksi Selisih Timbangan</p>
          <button 
            onClick={fetchValidations}
            className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-300"
          >
            <RotateCcw size={10} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-slate-500">Koneksi...</p>
        ) : validatedScalingList.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500 italic">Belum ada timbangan yang divalidasi hari ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-955 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="p-4">Nomor Order SBU</th>
                  <th className="p-4">No. Penerimaan</th>
                  <th className="p-4">Kelompok Tani</th>
                  <th className="p-4">Komoditas</th>
                  <th className="p-4 text-center">Berat Awal (Kg)</th>
                  <th className="p-4 text-center">Berat Aktual (Kg)</th>
                  <th className="p-4 text-center">Selisih Berat</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Catatan Operasional</th>
                  <th className="p-3 text-right">Tindakan Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 divide-slate-800/60">
                {validatedScalingList.map((d) => {
                  const hasShortageFlag = d.scaleStatus === "Kekurangan";
                  const dOrderId = d.orderId || (() => {
                    const matchedProc = procurements.find(p => p.id === d.procurementId);
                    return matchedProc ? matchedProc.orderId : "";
                  })() || "Kustom / Mandiri";

                  return (
                    <tr key={d.id} className="hover:bg-slate-850/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-cyan-400 bg-cyan-950/25 px-2.5 py-1 rounded inline-block border border-cyan-900/40 my-1">{dOrderId}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">{d.id}</td>
                      <td className="p-4 font-semibold text-white">{d.farmerName}</td>
                      <td className="p-4 text-slate-300 font-medium">{d.commodity}</td>
                      <td className="p-4 text-center font-semibold text-slate-405 text-slate-400">{d.sentWeight.toLocaleString("id-ID")} Kg</td>
                      <td className="p-4 text-center font-bold text-white">{d.scaledWeightWarehouse?.toLocaleString("id-ID")} Kg</td>
                      <td className={`p-4 text-center font-bold ${
                        d.scaleStatus === "Sesuai"
                          ? "text-slate-400"
                          : d.scaleStatus === "Kelebihan"
                          ? "text-blue-400"
                          : "text-rose-455 text-rose-405 text-rose-400"
                      }`}>
                        {d.scaleDifference !== undefined && d.scaleDifference > 0 
                          ? `+${d.scaleDifference.toLocaleString("id-ID")}` 
                          : d.scaleDifference?.toLocaleString("id-ID")} Kg
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          d.scaleStatus === "Sesuai"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : d.scaleStatus === "Kelebihan"
                            ? "bg-blue-600/10 text-blue-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {d.scaleStatus}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">{d.scaleNotes || "-"}</td>
                      <td className="p-3 text-right">
                        {hasShortageFlag && (
                          <button
                            onClick={() => {
                              setResolvingShortageId(d.id);
                              setResolvedDiffWeight(String(d.sentWeight));
                            }}
                            className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-amber-400 px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Edit3 size={11} />
                            <span>Koreksi Kelompok Tani</span>
                          </button>
                        )}
                        {!hasShortageFlag && (
                          <span className="text-slate-500 italic text-[10px]">Terkonfirmasi</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
