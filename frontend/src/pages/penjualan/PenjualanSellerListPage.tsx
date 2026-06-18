import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRolePrefix } from '../../lib/rolePathHelper';
import {
  Store,
  MapPin,
  Loader2,
  Search,
  ChevronRight
} from 'lucide-react';

interface Seller {
  id: string;
  tokoId: string;
  gudangId: string;
  status: string;
  catatan: string | null;
  kontrakMulai: string | null;
  kontrakAkhir: string | null;
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

const PenjualanSellerListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = getRolePrefix(location.pathname);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        setLoading(true);
        // Fetch from ECOMMERCE API directly - all active toko/sellers
        // ECOMMERCE backend dilindungi ApiKeyGuard global, wajib kirim x-api-key
        const ecommerceApiUrl = 'http://localhost:4000/api';
        const response = await fetch(`${ecommerceApiUrl}/toko`, {
          headers: {
            'x-api-key': 'ecommerce-nestjs-to-gudang-express-secure-key',
          },
        });
        const json = await response.json();

        // ECOMMERCE membungkus response via TransformInterceptor -> { success, data, timestamp }
        // dan FindAllStores juga mengembalikan { data: [...], total, page }.
        // Jadi array toko bisa ada di json.data (paginated) atau json.data.data (terbungkus).
        const tokoList = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.data)
            ? json.data.data
            : [];

        if (tokoList.length > 0) {
          // Map ECOMMERCE toko format to expected Seller format
          const mapped = tokoList.map((toko: any) => ({
            id: toko.id,
            tokoId: toko.id,
            gudangId: '',
            status: toko.status === 'AKTIF' ? 'ACTIVE' : toko.status,
            catatan: null,
            kontrakMulai: null,
            kontrakAkhir: null,
            toko: {
              id: toko.id,
              nama: toko.nama || toko.name || '-',
              slug: toko.slug || '',
              alamat: toko.alamat || '-',
              telepon: toko.telepon || '-',
              kabupaten: toko.kabupaten || toko.kota || '-',
              wilayah: toko.wilayah || toko.provinsi || 'Jawa Barat',
              fotoUrl: toko.fotoUrl || toko.foto || '',
              status: toko.status || 'AKTIF',
            },
            gudang: {
              id: '',
              kode: '-',
              nama: 'Semua Gudang',
            },
          }));
          setSellers(mapped);
        }
      } catch (error) {
        console.error('Error fetching sellers from ECOMMERCE:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  const filteredSellers = sellers.filter((seller) => 
    (seller.toko?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (seller.toko?.kabupaten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (seller.gudang?.nama || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="text-sm font-medium">Memuat data seller...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-semibold tracking-wider uppercase text-green-100">
            Manajemen Penjualan
          </span>
          <h1 className="text-2xl font-bold text-white mt-2">
            Daftar Seller & Toko Afiliasi
          </h1>
          <p className="text-sm mt-2 font-light leading-relaxed max-w-2xl text-green-50">
            Kelola semua seller dan toko afiliasi yang tersedia di gudang. Pantau performa penjualan mereka, kelola hubungan bisnis, dan optimalkan kerjasama untuk meningkatkan volume penjualan produk gudang.
          </p>
        </div>
      </div>

      {/* Search Bar + Count */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari seller berdasarkan nama toko, kota, atau gudang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 focus:outline-none"
          />
        </div>
        <p className="text-xs text-slate-400 px-1">
          Total {filteredSellers.length} seller {searchTerm && `dari ${sellers.length}`}
        </p>
      </div>

      {/* Sellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSellers.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Store className="w-10 h-10 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">Tidak ada seller ditemukan</p>
          </div>
        ) : (
          filteredSellers.map((seller) => (
            <div
              key={seller.id}
              onClick={() => navigate(`${prefix}/penjualan/seller/${seller.tokoId}`)}
              className="group bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer transition-all hover:border-green-200 hover:shadow-sm"
            >
              {/* Top: Icon + Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 p-2 rounded-lg">
                    <Store className="w-4 h-4 text-green-600" />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    seller.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-slate-50 text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${seller.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                    {seller.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-500 transition-colors" />
              </div>

              {/* Name + Gudang */}
              <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-green-700 transition-colors">
                {seller.toko.nama}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{seller.gudang.nama}</p>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3">
                <MapPin className="w-3.5 h-3.5 text-slate-300" />
                <span className="truncate">{seller.toko.kabupaten}, {seller.toko.wilayah}</span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default PenjualanSellerListPage;
