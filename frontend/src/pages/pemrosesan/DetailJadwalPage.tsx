import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  jadwalProduksiApi,
  JadwalProduksi,
  HariProduksi,
} from '../../api/jadwal-produksi.api';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  UserPlus,
  Edit2,
  RefreshCw,
} from 'lucide-react';

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'text-gray-700 bg-gray-100 border-gray-200', icon: <Clock size={15} /> },
  AKTIF: { label: 'Aktif', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <TrendingUp size={15} /> },
  SELESAI: { label: 'Selesai', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <CheckCircle2 size={15} /> },
  BATAL: { label: 'Batal', color: 'text-red-700 bg-red-50 border-red-200', icon: <XCircle size={15} /> },
};

const STATUS_HARI_CONFIG = {
  BELUM: { label: 'Belum Mulai', color: 'bg-gray-100 text-gray-600' },
  BERJALAN: { label: 'Berjalan', color: 'bg-amber-100 text-amber-700' },
  SELESAI: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
};

const DetailJadwalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [jadwal, setJadwal] = useState<JadwalProduksi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHariId, setActiveHariId] = useState<string | null>(null);

  // Form states
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusCatatan, setStatusCatatan] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const [editHari, setEditHari] = useState<HariProduksi | null>(null);
  const [realisasiKg, setRealisasiKg] = useState<string>('');
  const [statusHari, setStatusHari] = useState<'BELUM' | 'BERJALAN' | 'SELESAI'>('BELUM');
  const [hariCatatan, setHariCatatan] = useState<string>('');
  const [submittingHari, setSubmittingHari] = useState(false);

  const [workerName, setWorkerName] = useState('');
  const [workerKg, setWorkerKg] = useState('');
  const [workerTarif, setWorkerTarif] = useState('1500'); // default 1500
  const [workerCatatan, setWorkerCatatan] = useState('');
  const [submittingWorker, setSubmittingWorker] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await jadwalProduksiApi.getById(id);
      setJadwal(data);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat detail jadwal produksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newStatus) return;
    try {
      setSubmittingStatus(true);
      await jadwalProduksiApi.updateStatus(id, newStatus, statusCatatan);
      setUpdateStatusOpen(false);
      setStatusCatatan('');
      await fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Gagal memperbarui status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleOpenEditHari = (hari: HariProduksi) => {
    setEditHari(hari);
    setRealisasiKg(hari.realisasiKg !== undefined && hari.realisasiKg !== null ? hari.realisasiKg.toString() : '');
    setStatusHari(hari.statusHari);
    setHariCatatan(hari.catatan || '');
  };

  const handleUpdateHari = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHari) return;
    try {
      setSubmittingHari(true);
      await jadwalProduksiApi.updateHari(editHari.id, {
        realisasiKg: realisasiKg ? parseFloat(realisasiKg) : undefined,
        statusHari,
        catatan: hariCatatan,
      });
      setEditHari(null);
      await fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Gagal memperbarui realisasi hari');
    } finally {
      setSubmittingHari(false);
    }
  };

  const handleAddWorker = async (e: React.FormEvent, hariId: string) => {
    e.preventDefault();
    if (!workerName || !workerKg) return;
    try {
      setSubmittingWorker(true);
      await jadwalProduksiApi.addTenagaKerja(hariId, {
        namaPekerja: workerName,
        kgDikerjakan: parseFloat(workerKg),
        tarifPerKg: parseFloat(workerTarif),
        catatan: workerCatatan,
      });
      setWorkerName('');
      setWorkerKg('');
      setWorkerCatatan('');
      await fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Gagal menambahkan tenaga kerja');
    } finally {
      setSubmittingWorker(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pencatatan pekerja ini?')) return;
    try {
      await jadwalProduksiApi.deleteTenagaKerja(workerId);
      await fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus tenaga kerja');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-gray-500">
        <RefreshCw size={24} className="animate-spin mr-2" /> Memuat detail jadwal...
      </div>
    );
  }

  if (error || !jadwal) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-8 max-w-md text-center text-red-700 shadow-sm">
          <AlertTriangle size={36} className="mx-auto mb-3 text-red-500" />
          <p className="font-semibold">{error || 'Data tidak ditemukan'}</p>
          <button
            onClick={() => navigate('/pemrosesan/jadwal-produksi')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 transition-all"
          >
            <ArrowLeft size={16} /> Kembali ke Daftar
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[jadwal.statusJadwal] || STATUS_CONFIG.DRAFT;
  const persenSelesai = jadwal.summary?.persenSelesai ?? 0;
  const isExpired = new Date(jadwal.tenggat) < new Date() && jadwal.statusJadwal === 'AKTIF';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20 p-4 md:p-6 pb-20">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pemrosesan/jadwal-produksi')}
            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                {statusCfg.icon} {statusCfg.label}
              </span>
              {isExpired && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-red-700 bg-red-100">
                  <AlertTriangle size={11} /> Tenggat Lewat!
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{jadwal.komoditasNama}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewStatus(jadwal.statusJadwal);
              setUpdateStatusOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <Edit2 size={15} /> Update Status
          </button>
        </div>
      </div>

      {/* ── Main Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Info Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            Informasi Produksi
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-xs text-gray-400 block mb-1">KOMODITAS</span>
              <p className="font-semibold text-gray-800 text-base">{jadwal.komoditasNama}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">TOTAL VOLUME</span>
              <p className="font-semibold text-gray-800 text-base">{jadwal.volumeTotalKg.toLocaleString('id-ID')} kg</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">KAPASITAS HARIAN</span>
              <p className="font-semibold text-gray-800 text-base">{jadwal.kapasitasHarianKg.toLocaleString('id-ID')} kg/hari</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">TANGGAL MULAI</span>
              <p className="font-semibold text-gray-800 text-sm">{formatTanggal(jadwal.tanggalMulai)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">TANGGAL SELESAI (EST)</span>
              <p className="font-semibold text-gray-800 text-sm">{formatTanggal(jadwal.tanggalSelesai)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">TENGGAT BATAS</span>
              <p className={`font-semibold text-sm ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                {formatTanggal(jadwal.tenggat)}
              </p>
            </div>
          </div>

          {jadwal.catatanJadwal && (
            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm text-gray-600">
              <span className="font-semibold block text-gray-700 mb-1">Catatan Jadwal:</span>
              {jadwal.catatanJadwal}
            </div>
          )}
        </div>

        {/* Progress & Cost Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              Realisasi & Biaya
            </h2>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1.5">
                <span>Progress Total</span>
                <span className="font-bold text-emerald-700 text-base">{persenSelesai}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${persenSelesai >= 100 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(persenSelesai, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Realisasi: <strong>{(jadwal.summary?.totalRealisasiKg ?? 0).toLocaleString('id-ID')} kg</strong> dari target <strong>{jadwal.volumeTotalKg.toLocaleString('id-ID')} kg</strong>
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">BIAYA BORONGAN (KUMULATIF)</span>
                <p className="font-extrabold text-2xl text-amber-600 mt-0.5">
                  {formatRupiah(jadwal.summary?.totalBiayaBorongan ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Wallet size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Tarif Borongan Pengupasan: <strong>Rp 1.500/kg</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── Daily Production Detail Schedule ── */}
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <CalendarDays size={20} className="text-emerald-600" />
        Rincian Harian & Tenaga Kerja Borongan
      </h2>

      <div className="space-y-4">
        {jadwal.hariProduksi.map((hari) => {
          const isExpanded = activeHariId === hari.id;
          const statusHariCfg = STATUS_HARI_CONFIG[hari.statusHari] || STATUS_HARI_CONFIG.BELUM;
          const totalKgPekerja = hari.tenagaKerja.reduce((sum, w) => sum + w.kgDikerjakan, 0);
          const totalBiayaHari = hari.tenagaKerja.reduce((sum, w) => sum + w.totalUpah, 0);

          return (
            <div
              key={hari.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-slate-200"
            >
              {/* Day Header Row */}
              <div
                onClick={() => setActiveHariId(isExpanded ? null : hari.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-emerald-700 font-bold shrink-0">
                    <span className="text-xs uppercase font-normal block leading-none text-emerald-500 mb-0.5">Hari</span>
                    {hari.hariKe}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{formatTanggal(hari.tanggal)}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusHariCfg.color}`}>
                        {statusHariCfg.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        Target: <strong className="text-gray-600">{hari.targetKg.toLocaleString('id-ID')} kg</strong>
                      </span>
                      {hari.realisasiKg !== undefined && hari.realisasiKg !== null && (
                        <span className="text-xs text-gray-400">
                          · Realisasi: <strong className="text-emerald-600">{hari.realisasiKg.toLocaleString('id-ID')} kg</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Upah Borongan Hari Ini</span>
                    <strong className="text-amber-600 text-sm">{formatRupiah(totalBiayaHari)}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditHari(hari);
                      }}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-gray-600 hover:bg-slate-50 hover:text-emerald-600 transition-all"
                    >
                      Input Realisasi
                    </button>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Day Details: Borongan Workers List & Input */}
              {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-100 p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Worker Form */}
                    <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm h-fit">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <UserPlus size={14} className="text-emerald-600" />
                        Catat Pekerja Borongan
                      </h4>
                      <form onSubmit={(e) => handleAddWorker(e, hari.id)} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Nama Pekerja / Ibu-ibu Sekitar</label>
                          <input
                            type="text"
                            placeholder="Nama Pekerja"
                            value={workerName}
                            onChange={(e) => setWorkerName(e.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Volume (Kg)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Volume Kg"
                              value={workerKg}
                              onChange={(e) => setWorkerKg(e.target.value)}
                              required
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tarif (Rp/Kg)</label>
                            <input
                              type="number"
                              value={workerTarif}
                              onChange={(e) => setWorkerTarif(e.target.value)}
                              required
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (Opsional)</label>
                          <input
                            type="text"
                            placeholder="Keterangan tambahan"
                            value={workerCatatan}
                            onChange={(e) => setWorkerCatatan(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submittingWorker}
                          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          {submittingWorker ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                          Tambah Pekerja
                        </button>
                      </form>
                    </div>

                    {/* Workers Table/List */}
                    <div className="lg:col-span-2">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Daftar Pekerja Hari Ini ({hari.tenagaKerja.length})
                        </h4>
                        <span className="text-xs text-slate-500">
                          Total Dikerjakan: <strong>{totalKgPekerja.toLocaleString('id-ID')} kg</strong>
                        </span>
                      </div>

                      {hari.tenagaKerja.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                          <Package size={24} className="mx-auto mb-2 text-gray-300" />
                          Belum ada pencatatan tenaga kerja untuk hari ini.
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold">
                                  <th className="p-3">Nama Pekerja</th>
                                  <th className="p-3 text-right">Volume (Kg)</th>
                                  <th className="p-3 text-right">Tarif</th>
                                  <th className="p-3 text-right">Total Upah</th>
                                  <th className="p-3 text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-gray-700">
                                {hari.tenagaKerja.map((tk) => (
                                  <tr key={tk.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-semibold text-gray-900">
                                      {tk.namaPekerja}
                                      {tk.catatan && <span className="block text-[10px] text-gray-400 font-normal mt-0.5">{tk.catatan}</span>}
                                    </td>
                                    <td className="p-3 text-right">{tk.kgDikerjakan.toLocaleString('id-ID')} kg</td>
                                    <td className="p-3 text-right">{formatRupiah(tk.tarifPerKg)}/kg</td>
                                    <td className="p-3 text-right font-semibold text-amber-600">{formatRupiah(tk.totalUpah)}</td>
                                    <td className="p-3 text-right">
                                      <button
                                        onClick={() => handleDeleteWorker(tk.id)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal: Update Status Jadwal ── */}
      {updateStatusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-slate-50 border-b border-gray-150 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Edit2 size={16} className="text-emerald-600" />
                Update Status Jadwal
              </h3>
              <button onClick={() => setUpdateStatusOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status Baru</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="DRAFT">Draft (Perencanaan)</option>
                  <option value="AKTIF">Aktif (Sedang Berjalan)</option>
                  <option value="SELESAI">Selesai (Produksi Berakhir)</option>
                  <option value="BATAL">Batal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catatan Perubahan (Opsional)</label>
                <textarea
                  placeholder="Alasan perubahan status atau catatan produksi..."
                  value={statusCatatan}
                  onChange={(e) => setStatusCatatan(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setUpdateStatusOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {submittingStatus && <RefreshCw size={13} className="animate-spin" />}
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Input Realisasi Hari Produksi ── */}
      {editHari && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-150 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">
                Realisasi Hari ke-{editHari.hariKe} ({formatTanggal(editHari.tanggal)})
              </h3>
              <button onClick={() => setEditHari(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateHari} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Hari Ini</label>
                <p className="text-sm font-semibold text-slate-600">{editHari.targetKg.toLocaleString('id-ID')} kg</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Realisasi (Kg)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Volume realisasi dalam kg"
                  value={realisasiKg}
                  onChange={(e) => setRealisasiKg(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status Hari</label>
                <select
                  value={statusHari}
                  onChange={(e) => setStatusHari(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="BELUM">Belum Mulai</option>
                  <option value="BERJALAN">Sedang Berjalan</option>
                  <option value="SELESAI">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catatan Produksi Hari Ini</label>
                <textarea
                  placeholder="Catatan kendala, kualitas komoditas, dll..."
                  value={hariCatatan}
                  onChange={(e) => setHariCatatan(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditHari(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingHari}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {submittingHari && <RefreshCw size={13} className="animate-spin" />}
                  Simpan Realisasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailJadwalPage;
