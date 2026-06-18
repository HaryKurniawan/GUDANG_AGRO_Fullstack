import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
  ClipboardCheck,
  ClipboardList,
  Hourglass,
  Store,
  TrendingUp,
  Warehouse,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    processedRequests: 0,
    completedRequests: 0,
    totalStores: 0,
    capacityLimit: 0,
    capacityUsed: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Warehouses for capacity stats
        const warehousesRes = await api.get('/gudang/admin/my');
        const warehouses = warehousesRes.data.data;
        const totalCap = warehouses.reduce((acc: number, w: any) => acc + (w.kapasitasKg || 0), 0);
        const usedCap = warehouses.reduce((acc: number, w: any) => acc + (w.kapasitasTerpakai || 0), 0);

        // 2. Fetch Affiliate Stores
        const storesRes = await api.get('/toko-afiliasi');
        const storesCount = storesRes.data.data.length;

        // 3. Fetch Stock Requests
        const requestsRes = await api.get('/pengajuan');
        const requests = requestsRes.data.data;

        const totalReq = requests.length;
        const pendingReq = requests.filter((r: any) => r.status === 'DIAJUKAN').length;
        const processedReq = requests.filter((r: any) => ['DIPROSES', 'DIKIRIM'].includes(r.status)).length;
        const completedReq = requests.filter((r: any) => r.status === 'SELESAI').length;

        setStats({
          totalRequests: totalReq,
          pendingRequests: pendingReq,
          processedRequests: processedReq,
          completedRequests: completedReq,
          totalStores: storesCount,
          capacityLimit: totalCap,
          capacityUsed: usedCap,
        });

        // 5 most recent requests
        setRecentRequests(requests.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-sm font-medium">Memuat data analisis...</span>
        </div>
      </div>
    );
  }

  // Capacity calculation
  const capacityPercent = stats.capacityLimit > 0 ? (stats.capacityUsed / stats.capacityLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-slate-50 border border-emerald-200 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-600">
            Analitis Gudang
          </span>
          <h2 className="text-xl font-bold mt-1 text-slate-800">
            {`Selamat Datang Kembali, ${user?.nama}`}
          </h2>
          <p className="text-xs mt-1.5 font-light leading-relaxed max-w-xl text-slate-600">
            Semua logistik, pengajuan stok, dan monitoring kapasitas berjalan secara real-time. Anda saat ini bertanggung jawab penuh atas kelancaran operasional gudang mitra.
          </p>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Pending */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">Pengajuan Diajukan</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.pendingRequests}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Menunggu verifikasi Anda</span>
          </div>
        </div>

        {/* Total Processed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">Sedang Diproses</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.processedRequests}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Dalam perakitan / pengiriman</span>
          </div>
        </div>

        {/* Total Completed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">Pengajuan Selesai</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.completedRequests}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Stok toko telah ditambah</span>
          </div>
        </div>

        {/* Total Stores */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600">Toko Afiliasi Aktif</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalStores}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Mitra Toko terhubung aktif</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Capacity & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Capacity Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-400" />
              Kapasitas Penyimpanan
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light mb-6">
              Total kuota berat maksimal penyimpanan (Kg) untuk seluruh lokasi gudang yang Anda pegang.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">Total Terpakai</span>
              <span className="text-lg font-bold text-white">
                {stats.capacityUsed.toLocaleString()} <span className="text-xs text-slate-400">/ {stats.capacityLimit.toLocaleString()} Kg</span>
              </span>
            </div>

            {/* Slider bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  capacityPercent > 90
                    ? 'bg-rose-500'
                    : capacityPercent > 70
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-brand-500 to-emerald-400'
                }`}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Sisa Slot: {Math.max(0, stats.capacityLimit - stats.capacityUsed).toLocaleString()} Kg</span>
              <span>{capacityPercent.toFixed(1)}% Terisi</span>
            </div>
          </div>
        </div>

        {/* Recent Requests Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Pengajuan Stok Terbaru
              </h3>
              <button
                onClick={() => navigate('/pengajuan')}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-0.5 transition-colors"
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recentRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Tidak ada pengajuan stok masuk untuk gudang Anda saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pl-2">ID</th>
                      <th className="pb-3">Toko</th>
                      <th className="pb-3">Gudang</th>
                      <th className="pb-3">Produk</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-xs">
                    {recentRequests.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => navigate(`/pengajuan/${req.id}`)}
                        className="group hover:bg-slate-800/20 cursor-pointer transition-colors"
                      >
                        <td className="py-3 pl-2 font-mono text-slate-400 font-semibold group-hover:text-emerald-400 transition-colors">
                          #{req.id.substring(0, 8)}
                        </td>
                        <td className="py-3 font-semibold text-white">{req.toko.nama}</td>
                        <td className="py-3 text-slate-300">{req.gudang.nama}</td>
                        <td className="py-3 text-slate-400">{req.items.length} Item</td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              req.status === 'DIAJUKAN'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : ['DIPROSES', 'DIKIRIM'].includes(req.status)
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : req.status === 'SELESAI'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {req.status}
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
      </div>
    </div>
  );
};

export default DashboardPage;
