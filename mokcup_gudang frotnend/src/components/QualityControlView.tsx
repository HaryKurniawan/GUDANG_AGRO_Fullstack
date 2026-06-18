import React, { useState, useEffect, useRef } from "react";
import { CheckSquare, RotateCcw, AlertOctagon, ShieldCheck, Camera, Sparkles, Inbox, Trash } from "lucide-react";
import { QCChecklist, FarmerDelivery, UserSession, CommodityType } from "../types";

interface QualityControlViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

export default function QualityControlView({
  session, setErrorNotification, setSuccessNotification, triggerRefreshStats
}: QualityControlViewProps) {
  const [qcLogs, setQcLogs] = useState<QCChecklist[]>([]);
  const [deliveries, setDeliveries] = useState<FarmerDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected for verification
  const [activeDelivery, setActiveDelivery] = useState<FarmerDelivery | null>(null);

  // Checklist attributes
  const [warnaCerah, setWarnaCerah] = useState(true);
  const [teksturPadat, setTeksturPadat] = useState(true);
  const [tidakBerlendir, setTidakBerlendir] = useState(true); // Must be true!
  const [tidakAdaBercakBusuk, setTidakAdaBercakBusuk] = useState(true); // Must be true!
  const [tidakAdaBagianRusak, setTidakAdaBagianRusak] = useState(true); // Must be true!

  // Input weight & notes
  const [checkedWeight, setCheckedWeight] = useState("");
  const [rejectWeightInput, setRejectWeightInput] = useState(""); // weight to reject if custom
  const [rejectItemsInput, setRejectItemsInput] = useState<Array<{commodity: CommodityType; rejectWeight: string; reason: string}>>([]);
  const [qcNotes, setQcNotes] = useState("");

  const handleAddRejectItem = () => {
    if (!activeDelivery) return;
    setRejectItemsInput([
      ...rejectItemsInput,
      {
        commodity: activeDelivery.commodity,
        rejectWeight: "0",
        reason: "Bercak Busuk"
      }
    ]);
  };

  const handleUpdateRejectItem = (index: number, key: "commodity" | "rejectWeight" | "reason", value: string) => {
    const updated = [...rejectItemsInput];
    updated[index] = {
      ...updated[index],
      [key]: value as any
    };
    setRejectItemsInput(updated);
  };

  const handleRemoveRejectItem = (index: number) => {
    const updated = rejectItemsInput.filter((_, idx) => idx !== index);
    setRejectItemsInput(updated);
  };

  // Live snapshot state
  const [liveQcPhoto, setLiveQcPhoto] = useState<string | null>(null);
  const [liveQcMetadata, setLiveQcMetadata] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchQCData = async () => {
    setLoading(true);
    try {
      const qResponse = await fetch("/api/qc-checklists");
      const qData = await qResponse.json();
      setQcLogs(qData);

      const dResponse = await fetch("/api/deliveries");
      const dData = await dResponse.json();
      // Show deliveries that are accepted (Diterima) but haven't had QC checklists recorded yet
      const unChecked = dData.filter((d: any) => 
        d.status === "Diterima" && !qData.some((q: any) => q.deliveryId === d.id)
      );
      setDeliveries(unChecked);
    } catch (e) {
      setErrorNotification("Gagal meload modul Quality Control.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQCData();
  }, []);

  const selectDeliveryForQCCheck = (deliv: FarmerDelivery) => {
    setActiveDelivery(deliv);
    // Auto fill properties
    setCheckedWeight(String(deliv.scaledWeightWarehouse || deliv.sentWeight));
    setRejectWeightInput(String(deliv.scaledWeightWarehouse || deliv.sentWeight)); // default direct reject whole batch
    setWarnaCerah(true);
    setTeksturPadat(true);
    setTidakBerlendir(true);
    setTidakAdaBercakBusuk(true);
    setTidakAdaBagianRusak(true);
    setQcNotes("");
    setLiveQcPhoto(null);
    setLiveQcMetadata(null);
  };

  // Camera capture inside QC
  const toggleQcCamera = async () => {
    if (isCameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        setIsCameraActive(false);
        setErrorNotification("Tidak dapat terhubungi ke kamera laboratorium.");
      }
    }
  };

  const captureFrameQc = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setLiveQcPhoto(canvas.toDataURL("image/jpeg"));
        setLiveQcMetadata({
          timestamp: new Date().toISOString(),
          geolocation: "S 7° 58' 12\" E 112° 37' 41\" (Lab QC Malang Timur)",
          deviceInfo: navigator.userAgent.substring(0, 100) + " - WebUSB Lab Cam v2"
        });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        setIsCameraActive(false);
        setSuccessNotification("Uji sampling laboratorium terfoto!");
      }
    }
  };

  const triggerMockCaptureQc = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#022c22"; // deep lab slate background
      ctx.fillRect(0, 0, 640, 480);
      
      // Grid lines
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 480);
        ctx.stroke();
      }
      for (let j = 0; j < 480; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(640, j);
        ctx.stroke();
      }

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 16px Courier New";
      ctx.fillText(`SAMPLING TEST AUDIT: ${activeDelivery?.id || "N/A"}`, 50, 180);
      ctx.fillText(`KOMODITAS: ${activeDelivery?.commodity || "SAYUR"}`, 50, 210);
      ctx.font = "italic 11px monospace";
      ctx.fillText(`GEOTAG BOUNDARY SIGNED`, 50, 240);

      const mockDataUrl = canvas.toDataURL("image/jpeg");
      setLiveQcPhoto(mockDataUrl);
      setLiveQcMetadata({
        timestamp: new Date().toISOString(),
        geolocation: "S 7° 58' 12\" E 112° 37' 41\" (Lab QC Malang Timur)",
        deviceInfo: "Chrome 125.12 - Virtual Sandbox Webcam API"
      });
      setSuccessNotification("Simulasi foto sampling lab berhasil dibuat!");
    }
  };

  // Logic Reject: jika berlendir, bercak busuk, atau bagian rusak ditemukan -> produk REJECTED!
  const isRejectedByLogic = !tidakBerlendir || !tidakAdaBercakBusuk || !tidakAdaBagianRusak;

  useEffect(() => {
    if (isRejectedByLogic && activeDelivery && rejectItemsInput.length === 0) {
      setRejectItemsInput([
        {
          commodity: activeDelivery.commodity,
          rejectWeight: String(activeDelivery.scaledWeightWarehouse || activeDelivery.sentWeight),
          reason: !tidakBerlendir ? "Berlendir" : !tidakAdaBercakBusuk ? "Bercak Busuk" : "Bagian Rusak"
        }
      ]);
    } else if (!isRejectedByLogic) {
      setRejectItemsInput([]);
    }
  }, [isRejectedByLogic, activeDelivery]);

  const handlePostQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;

    const checkedVal = parseFloat(checkedWeight);
    if (isNaN(checkedVal) || checkedVal <= 0) {
      setErrorNotification("Silakan isi berat sampling teruji.");
      return;
    }

    let parsedRejectItems = [];
    let calculatedRejectWeight = 0;

    if (isRejectedByLogic) {
      if (rejectItemsInput.length === 0) {
        setErrorNotification("Harap masukkan setidaknya satu rincian sayur reject.");
        return;
      }
      for (const item of rejectItemsInput) {
        const itemVal = parseFloat(item.rejectWeight);
        if (isNaN(itemVal) || itemVal < 0) {
          setErrorNotification("Berat reject sayuran harus bernilai positif atau nol.");
          return;
        }
      }
      parsedRejectItems = rejectItemsInput.map((item) => ({
        commodity: item.commodity,
        rejectWeight: parseFloat(item.rejectWeight) || 0,
        reason: item.reason
      }));
      calculatedRejectWeight = parsedRejectItems.reduce((acc, curr) => acc + curr.rejectWeight, 0);
      if (calculatedRejectWeight > checkedVal) {
        setErrorNotification(`Total berat reject (${calculatedRejectWeight} Kg) melebihi berat sampling teruji (${checkedVal} Kg).`);
        return;
      }
    }

    // Default photo representation in base64 if not taken
    const photoToSend = liveQcPhoto || "simulated_qc_lab_base64_seal";
    const photoMetaToSend = liveQcMetadata || {
      timestamp: new Date().toISOString(),
      geolocation: "S 7° 58' 12\" E 112° 37' 41\" (Auto Geotag Lab)",
      deviceInfo: "Web client manual entry " + navigator.userAgent.substring(0, 50)
    };

    try {
      const response = await fetch("/api/qc-checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryId: activeDelivery.id,
          checkedWeight: checkedVal,
          warnaCerah,
          teksturPadat,
          tidakBerlendir,
          tidakAdaBercakBusuk,
          tidakAdaBagianRusak,
          rejectWeight: calculatedRejectWeight,
          rejectItems: parsedRejectItems,
          qcNotes,
          photoUrl: photoToSend,
          photoMetadata: photoMetaToSend,
          operator: { fullName: session.fullName, username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal mengesahkan checklist QC.");

      setSuccessNotification("Checklist Quality Control ditandatangani. Status sayuran berhasil dikomparasi.");
      setActiveDelivery(null);
      setRejectItemsInput([]);
      fetchQCData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Compute stats: total reject per komoditas, persentase reject (Fitur 7)
  const statsPerCommodity = qcLogs.reduce((acc: Record<string, { checked: number; reject: number }>, curr) => {
    if (!acc[curr.commodity]) {
      acc[curr.commodity] = { checked: 0, reject: 0 };
    }
    acc[curr.commodity].checked += curr.checkedWeight;

    if (curr.rejectItems && curr.rejectItems.length > 0) {
      curr.rejectItems.forEach((item) => {
        if (!acc[item.commodity]) {
          acc[item.commodity] = { checked: 0, reject: 0 };
        }
        acc[item.commodity].reject += item.rejectWeight;
      });
    } else {
      acc[curr.commodity].reject += curr.rejectWeight;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <CheckSquare className="text-emerald-400" size={20} />
          <span>Bongkar Muat & Quality Control (QC)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Checklist kelayakan fitosanitasi sayur beku meliputi tekstur, lendir, busuk jamur, dan saringan serangga.
        </p>
      </div>

      {/* STATS REJECT WIDGETS (Fitur 7) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <AlertOctagon size={14} className="text-rose-455 text-rose-400" />
          <span>Statistik Bahan Baku Reject per Komoditas (Fitur 7)</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {["Wortel", "Buncis", "Jagung Manis", "Sayuran Mix"].map((comm) => {
            const data = statsPerCommodity[comm] || { checked: 0, reject: 0 };
            const rate = data.checked > 0 ? (data.reject / data.checked) * 100 : 0;
            return (
              <div key={comm} className="bg-slate-955 p-3.5 rounded-xl border border-slate-850 font-sans space-y-1">
                <p className="text-[11px] text-slate-400 font-bold">{comm}</p>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-lg font-extrabold text-white">{data.reject.toLocaleString("id-ID")} Kg</span>
                  <span className="text-xs text-rose-400 font-mono font-bold">({rate.toFixed(1)}% Reject)</span>
                </div>
                <p className="text-[10px] text-slate-500">Dari total sampling {data.checked} kg</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* QC CHECK PANEL AND AUDITING FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHECKLIST FORM */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest pb-2 border-b border-slate-800 flex items-center space-x-1.5 mb-4">
              <Sparkles size={14} className="text-emerald-400" />
              <span>Pemeriksaan Laboratorium Komparatif</span>
            </h3>

            {activeDelivery ? (
              <form onSubmit={handlePostQC} className="space-y-4">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs leading-relaxed space-y-1">
                  <p className="text-slate-550 font-bold text-emerald-400">BATCH TEST: {activeDelivery.id}</p>
                  <p className="text-white font-medium">Pengirim: {activeDelivery.farmerName}</p>
                  <p className="text-slate-400">Komoditas: {activeDelivery.commodity} (Berat Bersih: {activeDelivery.scaledWeightWarehouse || activeDelivery.sentWeight} Kg)</p>
                </div>

                <div className="space-y-3 p-3.5 bg-slate-950 rounded-xl border border-slate-850">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center space-x-1">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span>Ambang Standard Mutu SBU Bandung (Checklist)</span>
                  </p>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={warnaCerah}
                        onChange={(e) => setWarnaCerah(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500"
                      />
                      <span>Warna Cerah, Alami, & Sesuai Spesifikasi</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={teksturPadat}
                        onChange={(e) => setTeksturPadat(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500"
                      />
                      <span>Tekstur Padat dan Renyah (Bebas Dehidrasi)</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs text-slate-300 border-t border-slate-900 pt-2">
                      <input
                        type="checkbox"
                        checked={tidakBerlendir}
                        onChange={(e) => setTidakBerlendir(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-500"
                      />
                      <span>Bebas Lendir Bakteri pembusuk</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={tidakAdaBercakBusuk}
                        onChange={(e) => setTidakAdaBercakBusuk(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-500"
                      />
                      <span>Bebas Bercak Busuk / Jamur Penyakit Kulit</span>
                    </label>

                    <label className="flex items-center space-x-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={tidakAdaBagianRusak}
                        onChange={(e) => setTidakAdaBagianRusak(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-500"
                      />
                      <span>Bebas Bagian Rusak (Pecah / Terpotong Cacing)</span>
                    </label>
                  </div>
                </div>

                {isRejectedByLogic ? (
                  <div className="p-3.5 bg-rose-955/40 border border-rose-900/45 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-rose-900/30 pb-2">
                      <p className="font-bold text-rose-300 flex items-center text-xs">
                        <AlertOctagon size={13} className="mr-1.5 text-rose-400 animate-pulse" /> 
                        <span>DAFTAR BARANG REJECT (MULTI-SAYUR)</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleAddRejectItem}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase px-2 py-1 rounded cursor-pointer transition-all active:scale-95"
                      >
                        + Tambah Baris
                      </button>
                    </div>
                    
                    <p className="text-[11px] leading-normal text-rose-200/90 italic font-sans">
                      Terdeteksi cacat kriteria sanitasi krusial. Tentukan rincian komoditas sayur yang membusuk / rusak beserta bobot isolasi masing-masing:
                    </p>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {rejectItemsInput.map((item, index) => {
                        return (
                          <div key={index} className="p-2.5 bg-slate-950/80 border border-rose-900/40 rounded-lg space-y-2 relative">
                            {/* Row Header */}
                            <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                              <span className="text-rose-400 font-bold text-[9px]">BARIS #{index + 1}</span>
                              {rejectItemsInput.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRejectItem(index)}
                                  className="text-rose-400 hover:text-rose-300 font-bold text-[9px] uppercase font-mono cursor-pointer transition-colors"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>

                            {/* Inputs Row */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">Jenis Sayur</label>
                                <select
                                  value={item.commodity}
                                  onChange={(e) => handleUpdateRejectItem(index, "commodity", e.target.value)}
                                  className="w-full mt-1 p-1 bg-slate-900 text-white border border-slate-800 rounded text-[11px] outline-none font-medium"
                                >
                                  <option value="Wortel">Wortel</option>
                                  <option value="Buncis">Buncis</option>
                                  <option value="Jagung Manis">Jagung Manis</option>
                                  <option value="Sayuran Mix">Sayuran Mix</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">Sumber Masalah</label>
                                <select
                                  value={item.reason}
                                  onChange={(e) => handleUpdateRejectItem(index, "reason", e.target.value)}
                                  className="w-full mt-1 p-1 bg-slate-900 text-white border border-slate-800 rounded text-[11px] outline-none font-medium"
                                >
                                  <option value="Bercak Busuk">Bercak Busuk</option>
                                  <option value="Berlendir">Berlendir</option>
                                  <option value="Bagian Rusak">Bagian Rusak (Lubang / Ulat)</option>
                                  <option value="Lainnya">Spesifikasi Lainnya</option>
                                </select>
                              </div>

                              <div className="col-span-2">
                                <label className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">Berat Isolasi Reject (Kg)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={item.rejectWeight}
                                  onChange={(e) => handleUpdateRejectItem(index, "rejectWeight", e.target.value)}
                                  className="w-full mt-1 p-1 bg-slate-900 text-white border border-slate-800 rounded text-[11px] font-bold font-mono outline-none text-right focus:border-rose-500"
                                  placeholder="Contoh: 15.0"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Accumulation */}
                    <div className="pt-2 border-t border-rose-900/30 flex justify-between items-center text-[11px] font-bold">
                      <span className="text-rose-300">TOTAL BERAT REJECT DIISOLASI:</span>
                      <span className="font-mono bg-rose-955 px-2 py-0.5 rounded border border-rose-800 text-rose-300">
                        {rejectItemsInput.reduce((acc, curr) => acc + (parseFloat(curr.rejectWeight) || 0), 0).toLocaleString("id-ID")}{" "}
                        <span className="text-[9px] font-sans">Kg</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center">
                    <ShieldCheck size={14} className="mr-1" /> BATCH 100% LOLOS STANDARD QUALITY CONTROL!
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[11px] text-slate-400 uppercase font-medium">Catatan & Uji Lab Singkat</label>
                  <input
                    type="text"
                    required
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                    placeholder="Wajib diisi: cth, kadar air, kesegaran daun, dll."
                    className="w-full text-xs p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg outline-none"
                  />
                </div>

                {/* ADVANCED GEOTAG LAB CAMERA CONTROLS */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1">
                      <Camera size={13} className="text-emerald-400 animate-pulse" />
                      <span>Sistem Kamera Sampling Lab</span>
                    </span>
                    <span className="text-[9px] text-emerald-500 font-mono">Dukungan Geotag & Waktu Nyata</span>
                  </div>

                  {/* Camera Viewfinder */}
                  {isCameraActive && (
                    <div className="relative aspect-video max-w-xs mx-auto bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 text-center">
                        <span className="text-[10px] text-emerald-400 font-bold tracking-wider animate-pulse">LIVE CAMERA PREVIEW READOUT</span>
                      </div>
                    </div>
                  )}

                  {/* Captured Photo Frame (With interactive preview) */}
                  {liveQcPhoto && (
                    <div className="space-y-1.5 p-2 bg-slate-900 border border-emerald-950 rounded-lg text-center">
                      <div className="relative aspect-video max-w-xs mx-auto border border-emerald-500/30 rounded-lg overflow-hidden">
                        <img src={liveQcPhoto} alt="Lab preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setLiveQcPhoto(null);
                            setLiveQcMetadata(null);
                          }}
                          className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full text-xs shadow-lg transition-colors cursor-pointer"
                          title="Hapus Foto"
                        >
                          <Trash size={12} />
                        </button>
                      </div>

                      {liveQcMetadata && (
                        <div className="p-2 bg-slate-950 text-[9px] text-left font-mono text-emerald-400/90 rounded border border-emerald-950/50 leading-relaxed">
                          <p><strong>Geotag:</strong> {liveQcMetadata.geolocation}</p>
                          <p><strong>Time:</strong> {new Date(liveQcMetadata.timestamp).toLocaleString("id-ID")}</p>
                          <p className="truncate"><strong>Hardware:</strong> {liveQcMetadata.deviceInfo}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Viewfinder Empty State */}
                  {!isCameraActive && !liveQcPhoto && (
                    <div className="py-8 bg-slate-900 text-center border border-dashed border-slate-800 rounded-lg">
                      <Camera size={26} className="mx-auto text-slate-700 mb-2" />
                      <p className="text-[11px] text-slate-500 italic font-sans">Kamera Lab QC Nonaktif</p>
                    </div>
                  )}

                  {/* Dedicated Buttons conforming to Indonesia Revisions */}
                  <div className="flex flex-col gap-2">
                    {/* Nyalakan Kamera */}
                    {!isCameraActive && !liveQcPhoto && (
                      <button
                        type="button"
                        onClick={toggleQcCamera}
                        className="w-full py-2 bg-slate-800 text-slate-100 hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all text-slate-100"
                      >
                        <Camera size={13} className="text-emerald-400" />
                        <span>Nyalakan Kamera</span>
                      </button>
                    )}

                    {/* Ambil Foto */}
                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={captureFrameQc}
                        className="w-full py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md text-white"
                      >
                        <CheckSquare size={13} />
                        <span>Ambil Foto</span>
                      </button>
                    )}

                    {/* Ulangi Foto & Simpan Foto */}
                    {liveQcPhoto && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLiveQcPhoto(null);
                            setLiveQcMetadata(null);
                            toggleQcCamera(); // immediately restart feed
                          }}
                          className="py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all text-white"
                        >
                          <RotateCcw size={13} />
                          <span>Ulangi Foto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSuccessNotification("Uji sampling tersegel & terkunci di draf! Klik 'Sahkan Checklist QC' untuk menyimpan permanen.");
                          }}
                          className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm text-white"
                        >
                          <ShieldCheck size={13} />
                          <span>Simpan Foto</span>
                        </button>
                      </div>
                    )}

                    {/* Simulation bypass mode */}
                    {!isCameraActive && !liveQcPhoto && (
                      <button
                        type="button"
                        onClick={triggerMockCaptureQc}
                        className="w-full py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-[10px] text-slate-400 font-semibold rounded-lg cursor-pointer"
                      >
                        Simulasi Kamera (Bypass Sandbox)
                      </button>
                    )}

                    {/* Stop Camera active stream */}
                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={toggleQcCamera}
                        className="w-full py-1.5 bg-red-950/20 border border-red-900/30 hover:bg-red-955 text-red-400 text-[10px] rounded cursor-pointer"
                      >
                        Matikan Kamera
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveDelivery(null)}
                    className="flex-1 py-2 bg-slate-955 hover:bg-slate-850 text-slate-405 text-slate-400 hover:text-white rounded-lg text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-lg text-xs shadow-md"
                  >
                    Sahkan Checklist QC
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-center py-16 italic text-slate-500 font-mono text-xs">
                Pilih salah satu nomor penerimaan sayur masuk di tabel sebelah kanan untuk menguji sampling bakteri, jamur, and visual sayur beku.
              </p>
            )}
          </div>

          <div className="text-[10px] text-slate-500 p-2 text-center border-t border-slate-850 font-mono italic leading-normal">
            *Ketentuan SI: Jika berlendir, bercak busuk, atau cacat ulat, maka komoditas langsung dimasukkan log reject pergudangan.
          </div>
        </div>

        {/* ACTIVE DELIVERIES TO TEST */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest pb-2 border-b border-slate-800">
              Muatan Truk Menanti QC ({deliveries.length})
            </h3>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto mt-3 pr-1">
              {deliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="mx-auto text-slate-700/60 mb-2" size={30} />
                  <p className="text-[11px] text-slate-505 text-slate-500 italic font-mono leading-relaxed">Seluruh muatan hari ini telah lulus uji laboratorium.</p>
                </div>
              ) : (
                deliveries.map((deliv) => (
                  <div key={deliv.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                    <div className="text-xs">
                      <p className="font-mono font-bold text-emerald-400">{deliv.id}</p>
                      <p className="text-white font-semibold truncate max-w-[160px]">{deliv.farmerName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Est: {deliv.scaledWeightWarehouse || deliv.sentWeight} Kg • {deliv.commodity}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectDeliveryForQCCheck(deliv)}
                      className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-[10px] font-bold p-1.5 px-3 rounded cursor-pointer leading-none"
                    >
                      Buka Checklist
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* QC LOGS RECORDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-800 bg-slate-955 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Arsip Uji Mutu Fitosanitasi (Checklists)</p>
          <button 
            onClick={fetchQCData}
            className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-300"
          >
            <RotateCcw size={10} />
            <span>Penyegaran</span>
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-slate-500">Membaca arsip QC...</p>
        ) : qcLogs.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500 italic">Belum ada checklist QC terekam.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-955 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="p-4">No. QC</th>
                  <th className="p-4">Delivery Ref</th>
                  <th className="p-4">Waktu Uji</th>
                  <th className="p-4">Komoditas</th>
                  <th className="p-4">Sampel Uji</th>
                  <th className="p-4">Sanitasi Rusak/Berlendir</th>
                  <th className="p-4">Isolasi Reject</th>
                  <th className="p-4">Beban Lolos</th>
                  <th className="p-4">Pemeriksa</th>
                  <th className="p-4">Catatan Fitosanitasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 divide-slate-800/60">
                {qcLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-emerald-400">{log.id}</td>
                    <td className="p-4 font-mono text-slate-400">{log.deliveryId}</td>
                    <td className="p-4 text-slate-400">{new Date(log.checkedAt).toLocaleString("id-ID")}</td>
                    <td className="p-4 font-semibold text-white">{log.commodity}</td>
                    <td className="p-4 font-bold text-slate-300">{log.checkedWeight} Kg</td>
                    <td className="p-4">
                      {log.isReject ? (
                        <span className="text-rose-500 font-bold border border-rose-950 px-1 py-0.5 rounded uppercase font-mono text-[9px] bg-rose-950/20">
                          REJECT DETECTED
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold border border-emerald-950 px-1 py-0.5 rounded uppercase font-mono text-[9px] bg-emerald-950/20">
                          PASSED STERILE
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-rose-455 text-rose-400">{log.rejectWeight} Kg</td>
                    <td className="p-4 font-bold text-emerald-400">{log.passedWeight} Kg</td>
                    <td className="p-4 text-slate-300 font-medium">{log.checkedBy}</td>
                    <td className="p-4 text-slate-400 max-w-xs truncate">{log.qcNotes}</td>
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
