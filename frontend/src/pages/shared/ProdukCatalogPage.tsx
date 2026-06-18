import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  Package,
  Loader2,
  Plus,
  Trash2,
  X,
  Check
} from 'lucide-react';

const ProdukCatalogPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdminGudang =
    user?.peran === 'ADMIN_GUDANG' || user?.peran === 'SUPER_ADMIN';

  const [warehouseProducts, setWarehouseProducts] = useState<any[]>([]);
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMasterProduct, setSelectedMasterProduct] = useState<any | null>(null);
  const [stok, setStok] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch warehouse products from /staf endpoint
      const warehouseRes = await api.get('/produk/staf');
      console.log('Warehouse products:', warehouseRes.data.data);
      setWarehouseProducts(warehouseRes.data.data || []);
      
      // Fetch master products
      const masterRes = await api.get('/master-komoditas/staf/active');
      console.log('Master products:', masterRes.data.data);
      setMasterProducts(masterRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setSelectedMasterProduct(null);
    setStok(0);
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (!selectedMasterProduct) {
        throw new Error('Pilih produk master terlebih dahulu');
      }
      if (stok < 0) {
        throw new Error('Stok tidak boleh negatif');
      }

      // Get gudangId from warehouse products or use first managed warehouse
      let gudangId = '';
      if (warehouseProducts.length > 0) {
        gudangId = warehouseProducts[0].gudangId;
      }

      if (!gudangId) {
        throw new Error('Tidak dapat menentukan gudang. Silakan refresh halaman.');
      }

      const payload = {
        gudangId,
        masterKomoditasId: selectedMasterProduct.id,
        stok: Number(stok),
        hargaGudang: 0, // Price is set by admin in master products
      };

      console.log('Adding product with payload:', payload);
      await api.post('/produk/staf', payload);
      setSuccess('Produk berhasil ditambahkan ke gudang');
      
      await fetchData();
      setTimeout(() => setModalOpen(false), 800);
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.response?.data?.message || err.message || 'Gagal menambahkan produk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini dari gudang?')) return;
    try {
      await api.delete(`/produk/staf/${id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Manajemen Produk</span>
          <h2 className="text-lg font-bold text-slate-800 mt-1">Produk Gudang Saya</h2>
          <p className="text-xs text-slate-600 mt-1">Daftar produk yang dijual di gudang ini. Pilih dari master produk yang tersedia.</p>
        </div>
        {isAdminGudang && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        )}
      </div>

      {/* Main Catalog View */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : warehouseProducts.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Belum Ada Produk</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Gudang ini belum memiliki produk. Klik tombol "Tambah Produk" untuk menambahkan produk dari master list.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouseProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      prod.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {prod.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">
                  {prod.masterKomoditas?.nama || prod.nama}
                </h3>
                
                <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 mt-4 text-xs">
                  <div>
                    <span className="text-slate-600 font-medium text-[10px]">Harga</span>
                    <p className="font-bold text-amber-600 mt-0.5">Rp {(prod.masterKomoditas?.harga || prod.hargaGudang || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium text-[10px]">Satuan</span>
                    <p className="font-bold text-slate-700 mt-0.5">{prod.masterKomoditas?.satuan || prod.satuan || 'kg'}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteProduct(prod.id)}
                disabled={!isAdminGudang}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isAdminGudang
                    ? 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700'
                    : 'bg-slate-50 border border-slate-200 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Produk
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Add Product from Master */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 relative space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Tambah Produk ke Gudang</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">Pilih produk dari master list dan atur stok awal.</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold leading-relaxed">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Pilih Produk Master</label>
                <select
                  required
                  value={selectedMasterProduct?.id || ''}
                  onChange={(e) => {
                    const selected = masterProducts.find((p) => p.id === e.target.value);
                    setSelectedMasterProduct(selected);
                    console.log('Selected product:', selected);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Pilih Produk --</option>
                  {masterProducts && masterProducts.length > 0 ? (
                    masterProducts.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nama} ({prod.kategori})
                      </option>
                    ))
                  ) : (
                    <option disabled>Tidak ada produk master</option>
                  )}
                </select>
              </div>

              {selectedMasterProduct && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-600 font-medium text-[10px]">Satuan</span>
                      <p className="font-bold text-slate-700 mt-0.5">{selectedMasterProduct.satuan}</p>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium text-[10px]">Kategori</span>
                      <p className="font-bold text-slate-700 mt-0.5">{selectedMasterProduct.kategori}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium text-[10px]">Harga</span>
                    <p className="font-bold text-amber-600 mt-0.5">Rp {(selectedMasterProduct.harga || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium text-[10px]">Deskripsi</span>
                    <p className="text-slate-600 mt-0.5">{selectedMasterProduct.deskripsi}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Stok Awal</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stok}
                  onChange={(e) => setStok(parseFloat(e.target.value) || 0)}
                  placeholder="Masukkan jumlah stok awal"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Tambah Produk'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdukCatalogPage;
