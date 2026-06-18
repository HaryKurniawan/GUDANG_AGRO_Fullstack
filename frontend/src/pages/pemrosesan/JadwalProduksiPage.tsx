import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { jadwalProduksiApi, JadwalProduksi } from '../../api/jadwal-produksi.api';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  TrendingUp,
  Wallet,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'text-gray-600 bg-gray-100', icon: <Clock size={13} /> },
  AKTIF: { label: 'Aktif', color: 'text-emerald-700 bg-emerald-100', icon: <TrendingUp size={13} /> },
  SELESAI: { label: 'Selesai', color: 'text-blue-700 bg-blue-100', icon: <CheckCircle2 size={13} /> },
  BATAL: { label: 'Batal', color: 'text-red-700 bg-red-100', icon: <XCircle size={13} /> },
};

const FILTER_TABS = [
  { key: '', label: 'Semua' },
  { key: 'AKTIF', label: 'Aktif' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SELESAI', label: 'Selesai' },
  { key: 'BATAL', label: 'Batal' },
];

const JadwalProduksiPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const gudangId = user?.managedWarehouses?.[0]?.id;

  const [jadwalList, setJadwalList] = useState<JadwalProduksi[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jadwalProduksiApi.getList({
        gudangId: gudangId || undefined,
        statusJadwal: filterStatus || undefined,
      });
      setJadwalList(data);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus, gudangId]);

  // Summary stats
  const stats = {
    total: jadwalList.length,
    aktif: jadwalList.filter((j) => j.statusJadwal === 'AKTIF').length,
    volumeTotal: jadwalList.reduce((s, j) => s + j.volumeTotalKg, 0),
    biayaBorongan: jadwalList.reduce((s, j) => s + (j.summary?.totalBiayaBorongan || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 md:p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={24} className="text-emerald-600" />
            Jadwal Produksi
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Penjadwalan otomatis berdasarkan pesanan grosir · Kapasitas 1 ton/hari
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('baru')}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus size={15} />
            Buat Jadwal
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {[
          { label: 'Total Jadwal', value: stats.total, icon: <BarChart3 size={18} className="text-gray-500" />, bg: 'bg-white' },
          { label: 'Sedang Aktif', value: stats.aktif, icon: <TrendingUp size={18} className="text-emerald-500" />, bg: 'bg-emerald-50' },
          {
            label: 'Volume Total',
            value: `${(stats.volumeTotal / 1000).toFixed(1)} ton`,
            icon: <Package size={18} className="text-blue-500" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Biaya Borongan',
            value: formatRupiah(stats.biayaBorongan),
            icon: <Wallet size={18} className="text-amber-500" />,
            bg: 'bg-amber-50',
            small: true,
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-white/70 shadow-sm p-4`}>
            <div className="flex items-center gap-2 mb-1">
              {s.icon}
              <span className="text-xs text-gray-500 font-medium">{s.label}</span>
            </div>
            <p className={`font-bold text-gray-900 ${s.small ? 'text-base' : 'text-xl'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filterStatus === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw size={24} className="animate-spin mr-2" /> Memuat data jadwal...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center text-red-700">
          <AlertTriangle size={24} className="mx-auto mb-2" />
          <p>{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm underline">Coba lagi</button>
        </div>
      ) : jadwalList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center shadow-sm">
          <CalendarDays size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Belum ada jadwal produksi</p>
          <p className="text-sm text-gray-400 mt-1">Buat jadwal baru dari pesanan grosir yang masuk</p>
          <button
            onClick={() => navigate('baru')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
          >
            <Plus size={15} /> Buat Jadwal Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jadwalList.map((jadwal) => {
            const cfg = STATUS_CONFIG[jadwal.statusJadwal] || STATUS_CONFIG.DRAFT;
            const persen = jadwal.summary?.persenSelesai ?? 0;
            const isExpired = new Date(jadwal.tenggat) < new Date() && jadwal.statusJadwal === 'AKTIF';

            return (
              <div
                key={jadwal.id}
                onClick={() => navigate(jadwal.id)}
                className="group cursor-pointer rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all p-5"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {isExpired && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-red-700 bg-red-100">
                          <AlertTriangle size={11} /> Tenggat Lewat!
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{jadwal.komoditasNama}</h3>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
                  <div>
                    <span className="text-gray-400">Volume</span>
                    <p className="font-semibold text-gray-800">{jadwal.volumeTotalKg.toLocaleString('id-ID')} kg</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Tenggat</span>
                    <p className={`font-semibold ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                      {formatTanggal(jadwal.tenggat)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Mulai Produksi</span>
                    <p className="font-semibold text-gray-800">{formatTanggal(jadwal.tanggalMulai)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Durasi</span>
                    <p className="font-semibold text-gray-800">{jadwal.estimasiHari} hari</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress Produksi</span>
                    <span className="font-semibold text-emerald-700">{persen}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${persen >= 100 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(persen, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>
                      {jadwal.summary?.hariSelesai ?? 0}/{jadwal.estimasiHari} hari selesai
                    </span>
                    <span className="text-amber-600 font-medium">
                      Borongan: {formatRupiah(jadwal.summary?.totalBiayaBorongan ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JadwalProduksiPage;
