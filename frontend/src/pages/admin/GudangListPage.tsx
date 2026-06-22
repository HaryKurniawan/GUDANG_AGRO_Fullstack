import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, Phone, Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Gudang {
  id: string;
  kode: string;
  nama: string;
  tipe: string;
  alamat: string;
  kabupaten: string;
  provinsi: string;
  telepon?: string;
  email?: string;
  status: string;
  kapasitasKg: number;
  kapasitasTerpakai: number;
}

const GudangListPage: React.FC = () => {
  const navigate = useNavigate();
  const [gudangs, setGudangs] = useState<Gudang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchGudangs();
  }, []);

  const fetchGudangs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // GET /api/gudang is now public, but we can include token if available
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5005/api') + '/gudang', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGudangs(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data gudang');
      console.error('Error fetching gudangs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (_id: string, nama: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus gudang "${nama}"?`)) {
      return;
    }

    try {
      // TODO: Implement delete endpoint
      alert('Fitur delete belum diimplementasikan');
    } catch (err: any) {
      alert('Gagal menghapus gudang: ' + err.message);
    }
  };

  const filteredGudangs = gudangs.filter((gudang) => {
    const matchesSearch =
      gudang.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gudang.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gudang.kabupaten.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || gudang.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'FULL':
        return 'bg-orange-100 text-orange-800';
      case 'MAINTENANCE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getCapacityPercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data gudang...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manajemen Gudang</h1>
          <p className="text-slate-600 mt-1">Kelola semua gudang di sistem</p>
        </div>
        <button
          onClick={() => navigate('/admin/gudang/baru')}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tambah Gudang
        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cari Gudang
            </label>
            <input
              type="text"
              placeholder="Nama, kode, atau kabupaten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Tidak Aktif</option>
              <option value="FULL">Penuh</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gudang List */}
      <div className="space-y-4">
        {filteredGudangs.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Tidak ada gudang yang ditemukan</p>
          </div>
        ) : (
          filteredGudangs.map((gudang) => {
            const capacityPercent = getCapacityPercentage(gudang.kapasitasTerpakai, gudang.kapasitasKg);
            return (
              <div
                key={gudang.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Info Gudang */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{gudang.nama}</h3>
                        <p className="text-sm text-slate-600">Kode: {gudang.kode}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(gudang.status)}`}>
                        {gudang.status === 'ACTIVE' ? 'Aktif' : gudang.status === 'INACTIVE' ? 'Tidak Aktif' : gudang.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{gudang.kabupaten}, {gudang.provinsi}</span>
                      </div>
                      {gudang.telepon && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          <span>{gudang.telepon}</span>
                        </div>
                      )}
                      {gudang.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          <span>{gudang.email}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-slate-600">{gudang.alamat}</p>
                  </div>

                  {/* Capacity & Actions */}
                  <div className="space-y-4">
                    {/* Capacity Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Kapasitas</span>
                        <span className="text-sm text-slate-600">{capacityPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            capacityPercent > 90
                              ? 'bg-red-500'
                              : capacityPercent > 70
                              ? 'bg-orange-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${capacityPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {gudang.kapasitasTerpakai.toLocaleString('id-ID')} / {gudang.kapasitasKg.toLocaleString('id-ID')} kg
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/gudang/${gudang.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(gudang.id, gudang.nama)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GudangListPage;
