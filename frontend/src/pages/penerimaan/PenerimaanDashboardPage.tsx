import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
  Package,
  Loader2,
  CheckCircle,
  Zap,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import AfiliasiKepalaPetaniCard from '../../components/afiliasi/AfiliasiKepalaPetaniCard';

interface TrendData {
  bulan: string;
  totalPenerimaan: number;
}

const PenerimaanDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [petaniActive, setPetaniActive] = useState<boolean | null>(null);
  const [penerimaanStats, setPenerimaanStats] = useState({
    totalPenerimaan: 0,
    penerimaanAktif: 0,
    penerimaanSelesai: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Check PETANI health
        try {
          const petaniRes = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(3000) });
          setPetaniActive(petaniRes.ok);
        } catch {
          setPetaniActive(false);
        }

        // Fetch Penerimaan data
        try {
          const penerimaanRes = await api.get('/penerimaan');
          const penerimaanList = penerimaanRes.data.data || [];

          const totalPenerimaan = penerimaanList.length;
          const penerimaanAktif = penerimaanList.filter((p: any) => ['RECEIVED', 'VERIFIED'].includes(p.status)).length;
          const penerimaanSelesai = penerimaanList.filter((p: any) => p.status === 'STOCKED').length;

          setPenerimaanStats({
            totalPenerimaan,
            penerimaanAktif,
            penerimaanSelesai,
          });

          // Generate trend data from penerimaan (aggregate by month)
          const monthMap: Record<string, number> = {};
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

          penerimaanList.forEach((item: any) => {
            const date = new Date(item.createdAt);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            if (!monthMap[monthKey]) {
              monthMap[monthKey] = 0;
            }
            monthMap[monthKey] += 1;
          });

          const trend = Object.entries(monthMap)
            .map(([bulan, totalPenerimaan]) => ({ bulan, totalPenerimaan }))
            .slice(-6);

          setTrendData(trend);
        } catch (error) {
          console.error('Error fetching penerimaan data:', error);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="text-sm font-medium">Memuat data penerimaan...</span>
        </div>
      </div>
    );
  }

  // Calculate max for chart scaling
  const maxPenerimaan = Math.max(...trendData.map(t => t.totalPenerimaan), 1);

  return (
    <div className="space-y-6">
      {/* Banner Poster - Minimalis */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-semibold tracking-wider uppercase text-green-100">
            Dashboard Penerimaan
          </span>
          <h2 className="text-xl font-bold mt-1 text-white">
            Ringkasan Penerimaan Barang
          </h2>
          <p className="text-xs mt-1.5 font-light leading-relaxed max-w-xl text-green-50">
            Pantau seluruh penerimaan produk dari petani dan sistem PETANI. Kelola barang masuk, verifikasi kualitas, grading produk, dan masukan ke stok gudang secara real-time.
          </p>

          {/* Status Card */}
          <div className="mt-4 flex gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              petaniActive 
                ? 'bg-green-600/30 text-green-50 border border-green-500/40'
                : petaniActive === null
                ? 'bg-slate-600/30 text-slate-50 border border-slate-500/40'
                : 'bg-red-600/30 text-red-50 border border-red-500/40'
            }`}>
              {petaniActive ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : petaniActive === null ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Zap className="w-4 h-4 flex-shrink-0" />
              )}
              <span>PETANI: {petaniActive ? '✓ Aktif' : petaniActive === null ? 'Checking...' : '⚠ Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Afiliasi Kepala Petani - Show who's affiliated */}
      {user?.managedWarehouses && user.managedWarehouses.length > 0 && (
        <AfiliasiKepalaPetaniCard
          gudangKode={user.managedWarehouses[0]?.kode}
          title="Kepala Petani Penyuplai"
          description="Kepala petani yang akan mengirimkan hasil panen ke gudang ini"
          compact={true}
        />
      )}

      {/* Cards Row: Penerimaan Aktif */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Penerimaan Aktif Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="bg-green-50 p-2 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              Penerimaan Aktif
            </h3>
            <button
              onClick={() => navigate('/penerimaan/daftar')}
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-0.5"
            >
              Lihat Semua
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">{penerimaanStats.totalPenerimaan}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Total</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">{penerimaanStats.penerimaanAktif}</p>
              <p className="text-[10px] text-amber-600 font-medium mt-1">Aktif</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{penerimaanStats.penerimaanSelesai}</p>
              <p className="text-[10px] text-green-600 font-medium mt-1">Selesai</p>
            </div>
          </div>
        </div>

        {/* Riwayat Pengajuan Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              Riwayat
            </h3>
            <button
              onClick={() => navigate('/penerimaan')}
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-0.5"
            >
              Lihat
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 font-medium mb-2">Semua Penerimaan</p>
            <p className="text-2xl font-bold text-slate-800">{penerimaanStats.totalPenerimaan}</p>
          </div>
        </div>
      </div>

      {/* Trend Card - Full Width */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              Tren Penerimaan
            </h3>
            <p className="text-xs text-slate-500 mt-1 ml-11">Tren penerimaan barang dari petani (6 bulan terakhir)</p>
          </div>
          {trendData.length >= 2 && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              trendData[trendData.length - 1].totalPenerimaan >= trendData[trendData.length - 2].totalPenerimaan
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}>
              {trendData[trendData.length - 1].totalPenerimaan >= trendData[trendData.length - 2].totalPenerimaan ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>
                {trendData[trendData.length - 2].totalPenerimaan > 0
                  ? `${Math.abs(Math.round(((trendData[trendData.length - 1].totalPenerimaan - trendData[trendData.length - 2].totalPenerimaan) / trendData[trendData.length - 2].totalPenerimaan) * 100))}%`
                  : 'N/A'}
              </span>
            </div>
          )}
        </div>

        {trendData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">Belum ada data tren</p>
            <p className="text-xs mt-1">Data tren akan muncul setelah ada penerimaan barang</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between gap-3 h-40 px-2">
              {trendData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{item.totalPenerimaan}</span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-full max-w-[48px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max((item.totalPenerimaan / maxPenerimaan) * 100, 8)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{item.bulan}</span>
                </div>
              ))}
            </div>

            {/* Summary Row */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">Total Penerimaan</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {trendData.reduce((sum, t) => sum + t.totalPenerimaan, 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PenerimaanDashboardPage;
