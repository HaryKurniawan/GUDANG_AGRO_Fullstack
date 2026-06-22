import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface MasterKomoditas {
  id: string;
  nama: string;
  kategori?: string;
  satuan: string;
  harga?: number;
  deskripsi?: string;
  gambarUrl?: string;
  isActive: boolean;
  kodeKomoditasGlobal?: string | null;
  _count?: {
    produkGudang: number;
  };
}

const KomoditasReadOnlyPage: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const [komoditas, setKomoditas] = useState<MasterKomoditas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchKomoditas();
  }, []);

  const fetchKomoditas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5005/api') + '/master-komoditas/public/all', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal memuat data komoditas');
      }

      const data = await response.json();
      setKomoditas(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data komoditas');
      console.error('Error fetching komoditas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredKomoditas = komoditas.filter((item) => {
    const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategori = !filterKategori || item.kategori === filterKategori;
    const matchesStatus = !filterStatus || (filterStatus === 'active' ? item.isActive : !item.isActive);
    return matchesSearch && matchesKategori && matchesStatus;
  });

  const categories = [...new Set(komoditas.map((k) => k.kategori).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data komoditas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Master Komoditas</h1>
        <p className="text-slate-600 mt-1">
          Daftar komoditas yang tersedia dari petani. Pengelolaan dilakukan oleh Admin.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cari Komoditas
            </label>
            <input
              type="text"
              placeholder="Nama komoditas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Kategori
            </label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Komoditas Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filteredKomoditas.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            Tidak ada komoditas yang ditemukan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Nama</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Kode Global</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Kategori</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Satuan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Harga</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredKomoditas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.nama}</td>
                    <td className="px-6 py-4 text-sm">
                      {item.kodeKomoditasGlobal ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-xs">
                          {item.kodeKomoditasGlobal}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.kategori || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.satuan}</td>
                    <td className="px-6 py-4 text-sm font-medium text-amber-600">
                      Rp {(item.harga || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium w-fit ${
                          item.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <Check className="w-3 h-3" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            Tidak Aktif
                          </>
                        )}
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
  );
};

export default KomoditasReadOnlyPage;
