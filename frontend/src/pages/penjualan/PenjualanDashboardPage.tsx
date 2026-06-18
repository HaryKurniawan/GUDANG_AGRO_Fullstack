import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { getRolePrefix } from '../../lib/rolePathHelper';
import {
  Store,
  Loader2,
  CheckCircle,
  Zap,
  ShoppingCart,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Seller {
  id: string;
  tokoId: string;
  gudangId: string;
  status: string;
  toko: {
    id: string;
    nama: string;
    slug: string;
    alamat: string;
    telepon: string;
    kabupaten: string;
    wilayah: string;
    fotoUrl: string;
    status: string;
  };
  gudang: {
    id: string;
    kode: string;
    nama: string;
  };
}

interface TrendData {
  bulan: string;
  totalPesanan: number;
  totalPendapatan: number;
}

const PenjualanDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = getRolePrefix(location.pathname);
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [ecommerceActive, setEcommerceActive] = useState<boolean | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [orderStats, setOrderStats] = useState({
    totalPesanan: 0,
    pesananAktif: 0,
    pesananSelesai: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Check ECOMMERCE health
        try {
          const ecomRes = await fetch('http://localhost:4000/api/health', { signal: AbortSignal.timeout(3000) });
          setEcommerceActive(ecomRes.ok);
        } catch {
          setEcommerceActive(false);
        }

        // Fetch Affiliate Stores (sellers) from E-Commerce
        try {
          const ecommerceApiUrl = 'http://localhost:4000/api';
          const storesRes = await fetch(`${ecommerceApiUrl}/toko`, {
            headers: {
              'x-api-key': 'ecommerce-nestjs-to-gudang-express-secure-key',
            },
          });
          const json = await storesRes.json();
          const data = json?.data?.data || json?.data || [];
          setSellers(data.map((t: any) => ({
            id: t.id,
            tokoId: t.id,
            status: t.status === 'AKTIF' ? 'ACTIVE' : t.status,
            toko: t,
            gudang: { id: '', kode: '-', nama: 'Semua Gudang' }
          })));
        } catch (error) {
          console.error('Error fetching sellers:', error);
        }

        // Fetch Stock Requests as proxy for orders
        try {
          const requestsRes = await api.get('/pengajuan');
          const requests = requestsRes.data.data || [];

          const totalPesanan = requests.length;
          const pesananAktif = requests.filter((r: any) => ['DIAJUKAN', 'DIPROSES', 'DIKIRIM'].includes(r.status)).length;
          const pesananSelesai = requests.filter((r: any) => r.status === 'SELESAI').length;

          setOrderStats({
            totalPesanan,
            pesananAktif,
            pesananSelesai,
          });

          // Generate trend data from requests (aggregate by month)
          const monthMap: Record<string, { totalPesanan: number; totalPendapatan: number }> = {};
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

          requests.forEach((req: any) => {
            const date = new Date(req.createdAt);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            if (!monthMap[monthKey]) {
              monthMap[monthKey] = { totalPesanan: 0, totalPendapatan: 0 };
            }
            monthMap[monthKey].totalPesanan += 1;
            monthMap[monthKey].totalPendapatan += req.items?.length * 150000 || 0;
          });

          const trend = Object.entries(monthMap)
            .map(([bulan, data]) => ({ bulan, ...data }))
            .slice(-6);

          setTrendData(trend);
        } catch (error) {
          console.error('Error fetching orders:', error);
        }
      } catch (error) {
        console.error('Error fetching penjualan data:', error);
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
          <span className="text-sm font-medium">Memuat data penjualan...</span>
        </div>
      </div>
    );
  }

  // Calculate max for chart scaling
  const maxPesanan = Math.max(...trendData.map(t => t.totalPesanan), 1);

  return (
    <div className="space-y-6">
      {/* Banner Poster - Minimalis */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-semibold tracking-wider uppercase text-green-100">
            Dashboard Penjualan
          </span>
          <h2 className="text-xl font-bold mt-1 text-white">
            Manajemen Penjualan E-Commerce
          </h2>
          <p className="text-xs mt-1.5 font-light leading-relaxed max-w-xl text-green-50">
            Pantau seluruh penjualan produk dari E-Commerce Agro Jabar. Kelola pesanan masuk, monitor seller afiliasi, dan analisis tren penjualan secara real-time.
          </p>

          {/* Status Card */}
          <div className="mt-4 flex gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              ecommerceActive 
                ? 'bg-green-600/30 text-green-50 border border-green-500/40'
                : ecommerceActive === null
                ? 'bg-slate-600/30 text-slate-50 border border-slate-500/40'
                : 'bg-red-600/30 text-red-50 border border-red-500/40'
            }`}>
              {ecommerceActive ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : ecommerceActive === null ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Zap className="w-4 h-4 flex-shrink-0" />
              )}
              <span>E-Commerce: {ecommerceActive ? '✓ Aktif' : ecommerceActive === null ? 'Checking...' : '⚠ Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Row: Pesanan Aktif & Daftar Seller */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pesanan Aktif Hari Ini */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="bg-amber-50 p-2 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
              </div>
              Pesanan Aktif
            </h3>
            <button
              onClick={() => navigate(`${prefix}/pengajuan`)}
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-0.5"
            >
              Lihat Semua
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">{orderStats.pesananAktif}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Aktif</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{orderStats.pesananSelesai}</p>
              <p className="text-[10px] text-green-600 font-medium mt-1">Selesai</p>
            </div>
          </div>
        </div>

        {/* Daftar Seller Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="bg-green-50 p-2 rounded-lg">
                <Store className="w-5 h-5 text-green-600" />
              </div>
              Daftar Seller
            </h3>
            <button
              onClick={() => navigate(`${prefix}/penjualan/seller`)}
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-0.5"
            >
              Lihat Semua
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">{sellers.length}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{sellers.filter(s => s.status === 'ACTIVE').length}</p>
              <p className="text-[10px] text-green-600 font-medium mt-1">Aktif</p>
            </div>
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
              Tren Penjualan Agregat
            </h3>
            <p className="text-xs text-slate-500 mt-1 ml-11">Agregat tren dari semua seller afiliasi (6 bulan terakhir)</p>
          </div>
          {trendData.length >= 2 && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              trendData[trendData.length - 1].totalPesanan >= trendData[trendData.length - 2].totalPesanan
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}>
              {trendData[trendData.length - 1].totalPesanan >= trendData[trendData.length - 2].totalPesanan ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>
                {trendData[trendData.length - 2].totalPesanan > 0
                  ? `${Math.abs(Math.round(((trendData[trendData.length - 1].totalPesanan - trendData[trendData.length - 2].totalPesanan) / trendData[trendData.length - 2].totalPesanan) * 100))}%`
                  : 'N/A'}
              </span>
            </div>
          )}
        </div>

        {trendData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">Belum ada data tren</p>
            <p className="text-xs mt-1">Data tren akan muncul setelah ada transaksi penjualan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between gap-3 h-40 px-2">
              {trendData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{item.totalPesanan}</span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-full max-w-[48px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max((item.totalPesanan / maxPesanan) * 100, 8)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{item.bulan}</span>
                </div>
              ))}
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium">Total Pesanan</p>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  {trendData.reduce((sum, t) => sum + t.totalPesanan, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium">Total Pendapatan</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  Rp {(trendData.reduce((sum, t) => sum + t.totalPendapatan, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium">Seller Aktif</p>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  {sellers.filter(s => s.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PenjualanDashboardPage;
