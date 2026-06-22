import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Check, X } from 'lucide-react';
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

const MasterKomoditasPage: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const [komoditas, setKomoditas] = useState<MasterKomoditas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kategori: '',
    satuan: 'kg',
    harga: 0,
    deskripsi: '',
    gambarUrl: '',
    kodeKomoditasGlobal: '',
  });

  useEffect(() => {
    fetchKomoditas();
  }, []);

  const fetchKomoditas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5005/api') + '/master-komoditas/admin', {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama.trim()) {
      alert('Nama komoditas wajib diisi');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5005/api')}/master-komoditas/admin/${editingId}`
        : (import.meta.env.VITE_API_URL || 'http://localhost:5005/api') + '/master-komoditas/admin';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan komoditas');
      }

      alert(editingId ? 'Komoditas berhasil diperbarui' : 'Komoditas berhasil ditambahkan');
      setShowForm(false);
      setEditingId(null);
      setFormData({ nama: '', kategori: '', satuan: 'kg', harga: 0, deskripsi: '', gambarUrl: '', kodeKomoditasGlobal: '' });
      fetchKomoditas();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (item: MasterKomoditas) => {
    setFormData({
      nama: item.nama,
      kategori: item.kategori || '',
      satuan: item.satuan,
      harga: item.harga || 0,
      deskripsi: item.deskripsi || '',
      gambarUrl: item.gambarUrl || '',
      kodeKomoditasGlobal: item.kodeKomoditasGlobal || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus komoditas "${nama}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5005/api')}/master-komoditas/admin/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus komoditas');
      }

      alert('Komoditas berhasil dihapus');
      fetchKomoditas();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5005/api')}/master-komoditas/admin/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengubah status');
      }

      fetchKomoditas();
    } catch (err: any) {
      alert('Error: ' + err.message);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Master Komoditas</h1>
          <p className="text-slate-600 mt-1">Kelola daftar komoditas yang tersedia</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ nama: '', kategori: '', satuan: 'kg', harga: 0, deskripsi: '', gambarUrl: '', kodeKomoditasGlobal: '' });
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tambah Komoditas
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? 'Edit Komoditas' : 'Tambah Komoditas Baru'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Komoditas *
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Tomat, Buncis, Wortel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  placeholder="Contoh: Sayuran, Buah, Bumbu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Satuan *
                </label>
                <select
                  value={formData.satuan}
                  onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                  <option value="ikat">ikat</option>
                  <option value="buah">buah</option>
                  <option value="liter">liter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.harga}
                  onChange={(e) => setFormData({ ...formData, harga: parseFloat(e.target.value) || 0 })}
                  placeholder="Contoh: 5000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Deskripsi komoditas..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kode Komoditas Global
                  <span className="ml-1 text-xs text-slate-400 font-normal">(Untuk link lintas sistem)</span>
                </label>
                <input
                  type="text"
                  value={formData.kodeKomoditasGlobal}
                  onChange={(e) => setFormData({ ...formData, kodeKomoditasGlobal: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                  placeholder="Contoh: WORTEL, CABAI_MERAH"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Huruf kapital, angka, dan garis bawah saja. Harus unik.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  URL Gambar
                </label>
                <input
                  type="url"
                  value={formData.gambarUrl}
                  onChange={(e) => setFormData({ ...formData, gambarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingId ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Digunakan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Aksi</th>
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
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item._count?.produkGudang || 0} produk
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleToggleStatus(item.id, item.isActive)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          item.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
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
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.nama)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

export default MasterKomoditasPage;
