import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, ShoppingCart, Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ProdukSellerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Get gudangId from URL or from user's managed warehouses
  const urlGudangId = searchParams.get('gudangId');
  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
  
  const [products, setProducts] = useState<any[]>([]);
  const [gudang, setGudang] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const SELLER_FRONTEND_URL = import.meta.env.VITE_SELLER_FRONTEND_URL || 'http://localhost:3004';
  const GUDANG_API_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5005/api');

  useEffect(() => {
    // Determine which gudangId to use
    if (urlGudangId) {
      // Priority 1: Use gudangId from URL
      setSelectedGudangId(urlGudangId);
    } else if (user?.managedWarehouses && user.managedWarehouses.length > 0) {
      // Priority 2: Use first managed warehouse if user is logged in
      setSelectedGudangId(user.managedWarehouses[0].id);
    } else {
      // No gudangId available
      setError('Parameter gudangId tidak ditemukan. Silakan akses halaman ini dengan parameter ?gudangId=xxx');
      setLoading(false);
    }
  }, [urlGudangId, user]);

  useEffect(() => {
    if (selectedGudangId) {
      fetchProductCatalog();
    }
  }, [selectedGudangId]);

  const fetchProductCatalog = async () => {
    try {
      setLoading(true);
      setError('');

      // Call public catalog endpoint (no auth required)
      const response = await fetch(`${GUDANG_API_URL}/produk/katalog?gudangId=${selectedGudangId}`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data produk');
      }

      const data = await response.json();
      
      if (data.statusCode === 200) {
        setGudang(data.data.gudang);
        setProducts(data.data.products);
      } else {
        throw new Error(data.message || 'Gagal mengambil data');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Terjadi kesalahan saat mengambil data produk');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = () => {
    // Redirect to seller frontend with gudangId
    window.location.href = `${SELLER_FRONTEND_URL}/seller/pengajuan-stok/baru?gudangId=${selectedGudangId}`;
  };

  const handleProductClick = (productId: string) => {
    // Redirect to seller frontend with gudangId and pre-selected product
    window.location.href = `${SELLER_FRONTEND_URL}/seller/pengajuan-stok/baru?gudangId=${selectedGudangId}&productId=${productId}`;
  };

  const handleWarehouseChange = (gudangId: string) => {
    setSelectedGudangId(gudangId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-sm text-slate-400">Memuat katalog produk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-rose-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Gagal Memuat Produk</h3>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warehouse Selector - Only show if user manages multiple warehouses */}
      {user?.managedWarehouses && user.managedWarehouses.length > 1 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">
            Pilih Gudang
          </label>
          <select
            value={selectedGudangId}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {user.managedWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.nama} ({warehouse.kode})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-brand-600/20 to-emerald-500/10 border border-brand-500/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              Katalog Produk B2B
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">
              {gudang?.nama || 'Gudang'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              📍 {gudang?.alamat}, {gudang?.kabupaten}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Kode: <span className="font-mono text-emerald-400">{gudang?.kode}</span>
            </p>
          </div>

          <button
            onClick={handleCreateRequest}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
          >
            <ShoppingCart className="w-5 h-5" />
            Buat Pengajuan Stok
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs text-blue-300 leading-relaxed">
          💡 <strong>Cara Memesan:</strong> Klik tombol "Ajukan Pengadaan" pada produk yang Anda inginkan, 
          atau klik "Buat Pengajuan Stok" untuk memilih beberapa produk sekaligus.
        </p>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">
            Belum Ada Produk
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Gudang ini belum mendaftarkan produk apapun. Silakan hubungi admin gudang 
            untuk informasi lebih lanjut.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">
              Menampilkan <span className="font-bold text-white">{products.length}</span> produk
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-brand-500/40 transition-all group"
              >
                {/* Product Image */}
                <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
                  {product.gambarUrl ? (
                    <img
                      src={product.gambarUrl}
                      alt={product.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-slate-700" />
                  )}
                  
                  {/* Overlay Badge */}
                  <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-white">Tersedia</span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {product.nama}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {product.deskripsi || 'Produk berkualitas dari gudang terpercaya'}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Harga B2B
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-amber-400">
                        {product.hargaGudang.toLocaleString('id-ID')}
                      </span>
                      <span className="text-sm text-slate-400">/ {product.satuan}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleProductClick(product.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Ajukan Pengadaan
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer Info */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500 leading-relaxed">
          Harga yang tertera adalah harga B2B (Business to Business) dari gudang. 
          Pengajuan stok akan diproses oleh admin gudang dalam 1-2 hari kerja.
        </p>
      </div>
    </div>
  );
};

export default ProdukSellerPage;
