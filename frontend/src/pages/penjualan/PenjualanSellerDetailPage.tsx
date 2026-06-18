import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { getRolePrefix } from '../../lib/rolePathHelper';
import {
  Store,
  Loader2,
  ChevronLeft,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Filter,
} from 'lucide-react';

interface SellerInfo {
  id: string;
  tokoId: string;
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

interface Pengajuan {
  id: string;
  tokoId: string;
  tokoNama: string;
  status: string;
  catatan: string | null;
  createdAt: string;
  gudang: { id: string; kode: string; nama: string };
  items: { id: string; produkNama: string; jumlahPermintaan: number; jumlahDisetujui: number | null }[];
}

type TabType = 'aktif' | 'semua';
type FilterType = 'SEMUA' | 'DIAJUKAN' | 'DIPROSES' | 'DIKIRIM' | 'SELESAI' | 'DITOLAK';

const PenjualanSellerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = getRolePrefix(location.pathname);
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('aktif');
  const [filter, setFilter] = useState<FilterType>('SEMUA');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch seller info langsung dari ECOMMERCE by ID (konsisten dengan list page).
        // ECOMMERCE dilindungi ApiKeyGuard global -> wajib kirim x-api-key.
        let found: SellerInfo | null = null;
        try {
          const ecommerceApiUrl = 'http://localhost:4000/api';
          const res = await fetch(`${ecommerceApiUrl}/toko/${id}`, {
            headers: {
              'x-api-key': 'ecommerce-nestjs-to-gudang-express-secure-key',
            },
          });
          const json = await res.json();
          // Response bisa terbungkus TransformInterceptor: { success, data, timestamp }
          const toko = json?.data?.data || json?.data || null;

          if (toko && toko.id) {
            found = {
              id: toko.id,
              tokoId: toko.id,
              status: toko.status === 'AKTIF' ? 'ACTIVE' : toko.status || 'ACTIVE',
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
              gudang: { id: '', kode: '-', nama: 'Semua Gudang' },
            };
          }
        } catch (ecomErr) {
          console.error('Gagal memuat toko dari ECOMMERCE:', ecomErr);
        }

        // Fallback removed

        setSeller(found);

        // Fetch pengajuan filtered by tokoId
        const pengajuanRes = await api.get(`/pengajuan?tokoId=${id}`);
        setPengajuanList(pengajuanRes.data.data || []);
      } catch (error) {
        console.error('Error fetching seller detail:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DIAJUKAN':
        return { bg: 'bg-amber-50 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Diajukan' };
      case 'DIPROSES':
        return { bg: 'bg-blue-50 text-blue-700', icon: <Package className="w-3.5 h-3.5" />, label: 'Diproses' };
      case 'DIKIRIM':
        return { bg: 'bg-indigo-50 text-indigo-700', icon: <Truck className="w-3.5 h-3.5" />, label: 'Dikirim' };
      case 'SELESAI':
        return { bg: 'bg-green-50 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Selesai' };
      case 'DITOLAK':
        return { bg: 'bg-red-50 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Ditolak' };
      default:
        return { bg: 'bg-slate-50 text-slate-700', icon: <Clock className="w-3.5 h-3.5" />, label: status };
    }
  };

  // Filter logic
  const activeStatuses = ['DIAJUKAN', 'DIPROSES', 'DIKIRIM'];
  const displayList = activeTab === 'aktif'
    ? pengajuanList.filter(p => activeStatuses.includes(p.status))
    : filter === 'SEMUA'
      ? pengajuanList
      : pengajuanList.filter(p => p.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="text-sm font-medium">Memuat detail seller...</span>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Store className="w-10 h-10 text-slate-200" />
        <p className="text-slate-400 text-sm">Seller tidak ditemukan</p>
        <button
          onClick={() => navigate(`${prefix}/penjualan/seller`)}
          className="text-green-600 hover:text-green-700 font-medium text-sm"
        >
          ← Kembali
        </button>
      </div>
    );
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'SEMUA', label: 'Semua' },
    { value: 'DIAJUKAN', label: 'Diajukan' },
    { value: 'DIPROSES', label: 'Diproses' },
    { value: 'DIKIRIM', label: 'Dikirim' },
    { value: 'SELESAI', label: 'Selesai' },
    { value: 'DITOLAK', label: 'Ditolak' },
  ];

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(`${prefix}/penjualan/seller`)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Kembali
      </button>

      {/* Seller Info - Compact */}
      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-4">
        <div className="bg-green-50 p-2.5 rounded-lg">
          <Store className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-800 truncate">{seller.toko.nama}</h1>
            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              seller.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${seller.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
              {seller.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span>{seller.gudang.nama}</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {seller.toko.kabupaten}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('aktif')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'aktif'
                ? 'text-green-700 border-b-2 border-green-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Pengajuan Aktif
            <span className="ml-1.5 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">
              {pengajuanList.filter(p => activeStatuses.includes(p.status)).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('semua')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'semua'
                ? 'text-green-700 border-b-2 border-green-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Semua Pengajuan
            <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
              {pengajuanList.length}
            </span>
          </button>
        </div>

        {/* Filter row (only on "Semua" tab) */}
        {activeTab === 'semua' && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === opt.value
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="p-4">
          {displayList.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              <Package className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Tidak ada pengajuan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayList.map((pengajuan) => {
                const badge = getStatusBadge(pengajuan.status);
                return (
                  <div
                    key={pengajuan.id}
                    onClick={() => navigate(`${prefix}/pengajuan/${pengajuan.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-50 hover:border-green-100 hover:bg-green-50/20 cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          #{pengajuan.id.substring(0, 8)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-400">
                          {new Date(pengajuan.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-slate-300">•</span>
                        <span className="text-[11px] text-slate-400">{pengajuan.items.length} item</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PenjualanSellerDetailPage;
