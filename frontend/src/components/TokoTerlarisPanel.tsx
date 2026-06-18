import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, Trophy, Loader2, Sparkles } from 'lucide-react';
import { analyticsApi, GudangTokoKategoriTerlaris, GudangTokoTerlarisItem } from '../api/analytics';

interface TokoTerlarisPanelProps {
  tokoId: string;
}

export const TokoTerlarisPanel: React.FC<TokoTerlarisPanelProps> = ({ tokoId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<GudangTokoKategoriTerlaris[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await analyticsApi.getTokoTerlaris(tokoId, 3);
        if (isMounted) {
          setCategories(data || []);
        }
      } catch (err: any) {
        console.error('Error in TokoTerlarisPanel:', err);
        if (isMounted) {
          setError('Gagal memuat data produk terlaris');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [tokoId]);

  // Aggregate all top products across categories to find top 3 absolute products
  const allProducts: GudangTokoTerlarisItem[] = [];
  categories.forEach((cat) => {
    cat.produkTerlaris.forEach((prod) => {
      allProducts.push(prod);
    });
  });

  // Sort by quantity sold descending and take top 3
  const top3Products = allProducts
    .sort((a, b) => b.totalTerjual - a.totalTerjual)
    .slice(0, 3);

  const formatRupiah = (n: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(n);
  };

  const getRankEmoji = (idx: number) => {
    switch (idx) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 bg-slate-50 rounded-xl border border-slate-100 mt-3">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 mr-2" />
        <span className="text-xs text-slate-500 font-medium">Memuat performa toko...</span>
      </div>
    );
  }

  if (error || top3Products.length === 0) {
    return (
      <div className="py-4 px-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 mt-3 text-center text-xs text-slate-400">
        <Package className="w-4 h-4 mx-auto mb-1 opacity-60" />
        Belum ada data penjualan 30 hari terakhir
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-150">
      <div className="flex items-center gap-1.5 mb-3">
        <Trophy className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
          Top 3 Produk Terlaris
          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
        </span>
      </div>

      <div className="space-y-2">
        {top3Products.map((product, idx) => (
          <div
            key={product.id}
            className="flex items-center gap-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl p-2.5 border border-slate-100 hover:border-slate-200 transition-all duration-200 group"
          >
            {/* Rank badge */}
            <span className="text-base flex-shrink-0 w-5 text-center">
              {getRankEmoji(idx)}
            </span>

            {/* Product image fallback */}
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center">
              {product.gambarUrl ? (
                <img
                  src={product.gambarUrl}
                  alt={product.nama}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <Package className="w-4 h-4 text-slate-300" />
              )}
            </div>

            {/* Product description */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                {product.nama}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] font-semibold text-slate-400">
                  {formatRupiah(product.harga)}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {product.totalTerjual.toFixed(1)} kg
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokoTerlarisPanel;
