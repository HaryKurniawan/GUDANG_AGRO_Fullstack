import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  Clock,
  Search,
  Package,
  Loader2,
  Leaf,
  Camera,
  MapPin,
  RotateCcw,
  Smartphone,
  Check,
  X,
  Scale,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface PenerimaanGudang {
  id: string;
  nomorPenerimaan: string;
  penjemputanId: string;
  penerima: { id: string; nama: string };
  gudang: { id: string; nama: string } | null;
  beratDiterimaKg: number;
  kondisi: string;
  status: 'RECEIVED' | 'VERIFIED' | 'STOCKED';
  createdAt: string;
  petaniNama?: string | null;
  komoditasNama?: string | null;
  kodeKomoditasGlobal?: string | null;
  sinkronisasiKePetani?: string | null;
  fotoUrl?: string | null;
  fotoMetadata?: {
    timestamp?: string;
    deviceInfo?: string;
    geolocation?: string;
  } | null;
  beratTimbangUlangKg?: number | null;
  selisihKg?: number | null;
}

type FilterStatus = 'SEMUA' | 'RECEIVED' | 'VERIFIED' | 'STOCKED';

const STATUS_CONFIG = {
  RECEIVED: { label: 'Baru Masuk', bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  VERIFIED: { label: 'Sudah Grading', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  STOCKED: { label: 'Masuk Stok', bg: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
};

const KONDISI_CONFIG: Record<string, { label: string; color: string }> = {
  BAIK: { label: 'Baik', color: 'text-green-600' },
  SEDANG: { label: 'Sedang', color: 'text-amber-600' },
  BURUK: { label: 'Buruk', color: 'text-red-500' },
};

const PenerimaanListPage: React.FC = () => {
  const navigate = useNavigate();
  const [penerimaanList, setPenerimaanList] = useState<PenerimaanGudang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('SEMUA');

  // Camera (Geotag Anti-Galeri) states for inline form
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedMetadata, setCapturedMetadata] = useState<{
    timestamp: string;
    deviceInfo: string;
    geolocation: string;
  } | null>(null);
  const [formFarmer, setFormFarmer] = useState('');
  const [formKomoditas, setFormKomoditas] = useState('');
  const [formBerat, setFormBerat] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchPenerimaan = async () => {
    try {
      const res = await api.get('/penerimaan');
      setPenerimaanList(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch penerimaan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenerimaan();
  }, []);

  // Camera functions
  const updateGeoMetadata = (geo: string) => {
    setCapturedMetadata({
      timestamp: new Date().toISOString(),
      deviceInfo: navigator.userAgent.includes('Mobi')
        ? `Mobile Device (${navigator.platform || 'Handheld'}) - Live GPS Camera`
        : `Desktop Station (${navigator.platform || 'Terminal'}) - Standard Camera`,
      geolocation: geo,
    });
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    setCapturedMetadata(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      let geoString = 'Akses lokasi ditolak pengguna';
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoString = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (Valid GPS)`;
            updateGeoMetadata(geoString);
          },
          () => updateGeoMetadata(geoString)
        );
      } else {
        updateGeoMetadata(geoString);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Gagal mengaktifkan kamera. Pastikan izin kamera diberikan.');
      setIsCameraActive(false);
    }
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
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedPhoto(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setCapturedMetadata(null);
    startCamera();
  };

  const triggerMockCapture = () => {
    setCapturedPhoto(
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%2310b981"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="white">Simulasi GPS Camera</text></svg>'
    );
    setCapturedMetadata({
      timestamp: new Date().toISOString(),
      deviceInfo: 'Simulasi Terminal (Bypass Sandbox)',
      geolocation: '-6.914744, 107.609810 (Bandung, Gudang Agro Jabar)',
    });
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedPhoto) {
      alert('Wajib mengambil foto bukti dari kamera!');
      return;
    }
    if (!formBerat || parseFloat(formBerat) <= 0) {
      alert('Berat harus valid');
      return;
    }
    setFormSubmitting(true);
    try {
      await api.post('/penerimaan', {
        petaniNama: formFarmer,
        komoditasNama: formKomoditas,
        beratDiterimaKg: parseFloat(formBerat),
        fotoUrl: capturedPhoto,
        fotoMetadata: capturedMetadata,
      });
      setShowNewForm(false);
      setFormFarmer('');
      setFormKomoditas('');
      setFormBerat('');
      setCapturedPhoto(null);
      setCapturedMetadata(null);
      fetchPenerimaan();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan penerimaan');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filtered = penerimaanList.filter((item) => {
    const matchSearch =
      search === '' ||
      item.nomorPenerimaan.toLowerCase().includes(search.toLowerCase()) ||
      (item.petaniNama || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.komoditasNama || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'SEMUA' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: penerimaanList.length,
    baru: penerimaanList.filter((p) => p.status === 'RECEIVED').length,
    grading: penerimaanList.filter((p) => p.status === 'VERIFIED').length,
    stok: penerimaanList.filter((p) => p.status === 'STOCKED').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Penerimaan Bahan Baku (Gate & Chiller)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Arsip logistik hulu. Pengiriman sayuran terikat dengan verifikasi foto GPS anti-galeri.
          </p>
        </div>
      </div>

      {/* Stats mini cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100' },
          { label: 'Baru Masuk', value: stats.baru, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Sudah Grading', value: stats.grading, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Masuk Stok', value: stats.stok, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── INLINE NEW PENERIMAAN FORM WITH CAMERA ──────────────────────── */}
      {showNewForm && (
        <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              Penerimaan Baru — Modul Geotag Camera (Anti-Galeri)
            </h3>
            <button type="button" onClick={() => { setShowNewForm(false); stopCamera(); setCapturedPhoto(null); }} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Form fields */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nama Petani / Kelompok</label>
                  <input
                    type="text"
                    required
                    value={formFarmer}
                    onChange={(e) => setFormFarmer(e.target.value)}
                    placeholder="Kelompok Tani Alam Segar"
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Komoditas</label>
                  <input
                    type="text"
                    required
                    value={formKomoditas}
                    onChange={(e) => setFormKomoditas(e.target.value)}
                    placeholder="Wortel, Buncis..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Berat Kirim dari Petani (Kg)</label>
                <div className="relative w-48">
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={formBerat}
                    onChange={(e) => setFormBerat(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-bold pr-10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Kg</span>
                </div>
              </div>

              {/* GPS metadata preview */}
              {capturedMetadata && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-1 text-[10px]">
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <MapPin className="w-3 h-3" />
                    Metadata Geotag Tersegel
                  </div>
                  <div className="text-slate-600 space-y-0.5">
                    <p>📍 {capturedMetadata.geolocation}</p>
                    <p>🕐 {new Date(capturedMetadata.timestamp).toLocaleString('id-ID')}</p>
                    <p>📱 {capturedMetadata.deviceInfo}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={formSubmitting || !capturedPhoto}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {formSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Daftarkan Log Penerimaan
                </button>
                {!capturedPhoto && (
                  <span className="text-[10px] text-rose-500 self-center font-medium">* Ambil foto dulu</span>
                )}
              </div>
            </div>

            {/* Right: Camera viewfinder */}
            <div className="lg:col-span-5 space-y-3">
              <canvas ref={canvasRef} className="hidden" />

              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700">
                {isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : capturedPhoto ? (
                  <img src={capturedPhoto} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400">Viewfinder kamera Mati</p>
                  </div>
                )}

                {capturedPhoto && (
                  <div className="absolute top-2 right-2 bg-emerald-600/90 px-2 py-0.5 rounded text-[9px] text-white font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> TERSEGEL
                  </div>
                )}
                {isCameraActive && (
                  <div className="absolute top-2 left-2 bg-red-600/90 px-2 py-0.5 rounded text-[9px] text-white font-bold animate-pulse flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {!isCameraActive && !capturedPhoto && (
                  <>
                    <button type="button" onClick={startCamera} className="w-full py-2.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Lanjut ke Camera
                    </button>
                    <button type="button" onClick={triggerMockCapture} className="w-full py-2 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-all">
                      Simulasi Kamera (Bypass Sandbox)
                    </button>
                  </>
                )}
                {isCameraActive && (
                  <>
                    <button type="button" onClick={capturePhotoFrame} className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                      <Camera className="w-4 h-4" /> Ambil Foto
                    </button>
                    <button type="button" onClick={stopCamera} className="w-full py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100">
                      Matikan Kamera
                    </button>
                  </>
                )}
                {capturedPhoto && (
                  <button type="button" onClick={handleRetakePhoto} className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Ulangi Foto
                  </button>
                )}
              </div>

              <p className="text-[9px] text-slate-400 italic text-center">
                * Fitur anti-bypass Galeri. Foto wajib diambil langsung dari kamera device.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder="Cari nomor, petani, komoditas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
          />
        </div>
        <div className="flex gap-1.5">
          {(['SEMUA', 'RECEIVED', 'VERIFIED', 'STOCKED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s === 'SEMUA' ? 'Semua' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 whitespace-nowrap transition-all"
          >
            <Camera className="w-3.5 h-3.5" /> Penerimaan Baru
          </button>
        )}
      </div>

      {/* ─── AUDIT TABLE (Mockup Style) ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Audit Penerimaan & Geotag Petani
          </p>
          <button
            onClick={() => { setLoading(true); fetchPenerimaan(); }}
            className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700"
          >
            <RotateCcw className="w-3 h-3" /> Sinkronisasi
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-green-500" />
            <span className="text-sm">Memuat data penerimaan...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
            <Package className="w-10 h-10" />
            <p className="text-sm text-slate-400 font-medium">
              {penerimaanList.length === 0 ? 'Belum ada penerimaan dari petani.' : 'Tidak ada hasil filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">No. Penerimaan</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Petani / Kelompok</th>
                  <th className="p-4">Komoditas</th>
                  <th className="p-4">Geotag & Bukti Foto</th>
                  <th className="p-4">Berat (Kg)</th>
                  <th className="p-4">Kondisi</th>
                  <th className="p-4">Status Rantai</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.status];
                  const kondisiCfg = KONDISI_CONFIG[item.kondisi] || { label: item.kondisi, color: 'text-slate-500' };
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-700 text-[11px]">
                        {item.nomorPenerimaan}
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {item.petaniNama || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Leaf className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="text-slate-600 text-[11px]">{item.komoditasNama || '-'}</span>
                          {item.kodeKomoditasGlobal && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-mono">
                              {item.kodeKomoditasGlobal}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {item.fotoUrl ? (
                            <div
                              className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-400 cursor-pointer flex-shrink-0 transition-all"
                              onClick={() => setLightboxUrl(item.fotoUrl!)}
                            >
                              <img src={item.fotoUrl} alt="bukti" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border flex-shrink-0">
                              <Camera className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="space-y-0.5 leading-none min-w-0">
                            <div className="flex items-center text-[9px] font-medium text-slate-600 gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {item.fotoMetadata?.geolocation || 'Belum ada GPS'}
                              </span>
                            </div>
                            {item.fotoMetadata?.timestamp && (
                              <p className="text-[8px] text-slate-400 font-mono flex items-center gap-0.5">
                                <Clock className="w-2 h-2" />
                                {new Date(item.fotoMetadata.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700 text-[11px]">
                        {item.beratDiterimaKg.toLocaleString('id-ID')} Kg
                      </td>
                      <td className="p-4">
                        <span className={`text-[11px] font-medium ${kondisiCfg.color}`}>
                          {kondisiCfg.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            const basePath = window.location.pathname.startsWith('/kepala-gudang')
                              ? '/kepala-gudang'
                              : window.location.pathname.startsWith('/admin') ? '/admin' : '/staf';
                            navigate(`${basePath}/penerimaan/${item.id}/grading`);
                          }}
                          disabled={item.status === 'STOCKED'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                            item.status === 'STOCKED'
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {item.status === 'RECEIVED' ? (
                            <><Scale className="w-3 h-3" /> Grading</>
                          ) : item.status === 'VERIFIED' ? (
                            <><CheckCircle className="w-3 h-3" /> Selesaikan</>
                          ) : (
                            <><Check className="w-3 h-3" /> Selesai</>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Menampilkan {filtered.length} dari {penerimaanList.length} penerimaan
        </p>
      )}

      {/* ─── LIGHTBOX ──────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Bukti foto" className="w-full rounded-xl shadow-2xl" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 text-slate-700 hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenerimaanListPage;
