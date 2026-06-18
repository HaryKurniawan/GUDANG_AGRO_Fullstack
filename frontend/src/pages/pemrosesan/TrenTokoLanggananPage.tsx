import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Package, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface TrendData {
  kodeKomoditasGlobal: string;
  komoditasNama: string;
  jumlahTokoPasar: number;
  salesVelocityKgPerDay: number;
  trendStatus: 'NAIK_TAJAM' | 'NAIK' | 'STABIL' | 'TURUN';
  trendPersen: number;
  rekomendasiBufferKg: number;
  stokGudangSaatIni: number;
}

export default function TrenTokoLanggananPage() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const gudangId = user?.managedWarehouses?.[0]?.id; // Ambil gudangId dari auth user
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5001/api/gudang/${gudangId}/trend-toko-langganan`);
      setData(res.data.data);
      setLastUpdated(res.data.lastUpdated);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data tren toko langganan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gudangId) {
      fetchData();
    }
  }, [gudangId]);

  const handleBuatJadwal = (komoditas: string, targetKg: number) => {
    const rolePrefix = user?.peran === 'ADMIN_GUDANG' ? '/kepala-gudang' : '/staf';
    navigate(`${rolePrefix}/pemrosesan/jadwal-produksi/baru?komoditas=${encodeURIComponent(komoditas)}&target=${targetKg}`);
  };

  const getTrendIcon = (status: string) => {
    switch (status) {
      case 'NAIK_TAJAM': return <TrendingUp className="text-red-600 w-5 h-5" />;
      case 'NAIK': return <TrendingUp className="text-orange-500 w-5 h-5" />;
      case 'STABIL': return <Minus className="text-blue-500 w-5 h-5" />;
      case 'TURUN': return <TrendingDown className="text-gray-500 w-5 h-5" />;
      default: return null;
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Tren Pasar E-Commerce</h1>
          <p className="text-gray-500 mt-1">
            Pantau kecepatan jualan seluruh toko di platform E-Commerce dan persiapkan suplai pasar (Smart Buffer).
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-sm">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Pemantauan Pasar Global Aktif</h2>
            <p className="text-emerald-50 text-sm leading-relaxed max-w-3xl">
              Gudang secara otomatis memantau kecepatan jualan dari <strong>seluruh toko E-Commerce</strong> yang ada. 
              <strong> Rekomendasi Smart Buffer</strong> menunjukkan proyeksi jumlah stok minimal yang sebaiknya diproduksi agar Gudang selalu siap saat toko mana pun membutuhkan pasokan.
            </p>
            {lastUpdated && (
              <p className="text-emerald-100 text-xs mt-3 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Update Terakhir: {new Date(lastUpdated).toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Menganalisa data dari seluruh toko E-Commerce...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {data.map((item) => {
            const isKritis = item.stokGudangSaatIni < item.rekomendasiBufferKg;
            
            return (
              <div key={item.kodeKomoditasGlobal} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isKritis ? 'border-orange-200' : 'border-gray-200'}`}>
                <div className={`p-4 border-b ${isKritis ? 'bg-orange-50' : 'bg-gray-50'} flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-md shadow-sm border border-gray-100">
                      {getTrendIcon(item.trendStatus)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{item.komoditasNama}</h3>
                      <p className="text-xs text-gray-500">Dipantau dari {item.jumlahTokoPasar} Toko Se-Platform</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Tren Permintaan</p>
                    <p className={`font-semibold flex items-center justify-end gap-1 ${item.trendPersen > 0 ? 'text-red-600' : item.trendPersen < 0 ? 'text-gray-500' : 'text-blue-600'}`}>
                      {item.trendPersen > 0 ? '+' : ''}{item.trendPersen}%
                    </p>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Kecepatan Jual Harian</p>
                      <p className="text-2xl font-bold text-gray-900">{item.salesVelocityKgPerDay} <span className="text-base font-normal text-gray-500">kg/hari</span></p>
                      <p className="text-xs text-gray-400 mt-1">Rata-rata 7 hari terakhir</p>
                    </div>
                    
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      <p className="text-sm text-emerald-800 font-medium mb-1 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Target Smart Buffer
                      </p>
                      <p className="text-2xl font-bold text-emerald-700">{item.rekomendasiBufferKg} <span className="text-base font-normal">kg</span></p>
                      <p className="text-xs text-emerald-600 mt-1">Stok aman untuk 2 hari</p>
                    </div>
                    
                    <div className={`${isKritis ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} p-3 rounded-lg border`}>
                      <p className={`text-sm font-medium mb-1 flex items-center gap-1 ${isKritis ? 'text-red-800' : 'text-gray-700'}`}>
                        {isKritis && <AlertTriangle className="w-4 h-4" />} Stok Siap Kirim Saat Ini
                      </p>
                      <p className={`text-2xl font-bold ${isKritis ? 'text-red-700' : 'text-gray-900'}`}>{item.stokGudangSaatIni} <span className="text-base font-normal">kg</span></p>
                      <p className={`text-xs mt-1 ${isKritis ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {isKritis ? `Kekurangan ${item.rekomendasiBufferKg - item.stokGudangSaatIni} kg` : 'Stok memenuhi buffer'}
                      </p>
                    </div>
                  </div>

                  {isKritis && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-orange-800">
                        <div className="bg-orange-100 p-2 rounded-full">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Aksi Diperlukan!</p>
                          <p className="text-xs text-orange-700">Segera jadwalkan produksi pengupasan/pengemasan untuk memenuhi potensi tarikan pasar.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleBuatJadwal(item.komoditasNama, item.rekomendasiBufferKg - item.stokGudangSaatIni)}
                        className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        Buat Jadwal Produksi <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
