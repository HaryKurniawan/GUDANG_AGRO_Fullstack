import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  Leaf,
} from 'lucide-react';

interface LaporanItem {
  produkId: string;
  produkNama: string;
  satuan: string;
  stok: number;
  hargaJual: number;
  hargaBeliPetani: number;
  biayaSortir: number;
  biayaGrading: number;
  biayaPengemasan: number;
  biayaOverhead: number;
  biayaLainnya: number;
  totalHpp: number;
  marginRp: number;
  marginPersen: number;
  hppConfigured: boolean;
}

interface Summary {
  totalProduk: number;
  hppConfigured: number;
  avgMarginPersen: number;
  totalRevenuePotensial: number;
  totalHppPotensial: number;
  totalMarginPotensial: number;
}

const LaporanHppPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const gudangId = user?.managedWarehouses?.[0]?.id || '';
  const [loading, setLoading] = useState(true);
  const [laporan, setLaporan] = useState<LaporanItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const fetchLaporan = async () => {
      try {
        setLoading(true);
        // Filter berdasarkan gudang yang dikelola user, konsisten dengan halaman Pengaturan HPP
        const res = await api.get('/hpp/laporan', {
          params: gudangId ? { gudangId } : undefined,
        });
        setLaporan(res.data.data.laporan || []);
        setSummary(res.data.data.summary || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLaporan();
  }, [gudangId]);

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Laporan HPP & Margin</h1>
        <p className="text-xs text-slate-400 mt-0.5">Profit margin per produk berdasarkan HPP yang sudah dikonfigurasi</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Produk</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalProduk}</p>
            <p className="text-[10px] text-slate-400">{summary.hppConfigured} HPP dikonfigurasi</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Avg Margin</p>
            <p className={`text-xl font-bold mt-1 ${summary.avgMarginPersen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {summary.avgMarginPersen}%
            </p>
            <p className="text-[10px] text-slate-400">rata-rata semua produk</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Revenue Potensial</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatRp(summary.totalRevenuePotensial)}</p>
            <p className="text-[10px] text-slate-400">jika semua stok terjual</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Profit Potensial</p>
            <p className={`text-xl font-bold mt-1 ${summary.totalMarginPotensial >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatRp(summary.totalMarginPotensial)}
            </p>
            <p className="text-[10px] text-slate-400">margin × stok</p>
          </div>
        </div>
      )}

      {/* Unconfigured warning */}
      {summary && summary.hppConfigured < summary.totalProduk && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{summary.totalProduk - summary.hppConfigured} produk</span> belum dikonfigurasi HPP-nya.
            Margin untuk produk tanpa HPP ditampilkan sebagai 100% (belum akurat).
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
          <BarChart3 size={14} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-700">Detail Margin Per Produk</h3>
        </div>

        {laporan.length === 0 ? (
          <div className="p-10 text-center">
            <Leaf className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Belum ada produk</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase text-[10px]">Produk</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase text-[10px]">Harga Beli</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase text-[10px]">Biaya Ops</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase text-[10px]">Total HPP</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase text-[10px]">Harga Jual</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase text-[10px]">Margin</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase text-[10px]">%</th>
                </tr>
              </thead>
              <tbody>
                {laporan.map((item) => {
                  const biayaOps = item.biayaSortir + item.biayaGrading + item.biayaPengemasan + item.biayaOverhead + item.biayaLainnya;
                  return (
                    <tr key={item.produkId} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Leaf size={11} className="text-emerald-400" />
                          <div>
                            <p className="font-semibold text-slate-700">{item.produkNama}</p>
                            {!item.hppConfigured && (
                              <p className="text-[9px] text-amber-500 italic">HPP belum diatur</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.hppConfigured ? formatRp(item.hargaBeliPetani) : '-'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.hppConfigured ? formatRp(biayaOps) : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{item.hppConfigured ? formatRp(item.totalHpp) : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatRp(item.hargaJual)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${item.marginRp >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {item.hppConfigured ? formatRp(item.marginRp) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.hppConfigured ? (
                          <span className={`inline-flex items-center gap-0.5 font-bold ${item.marginPersen >= 20 ? 'text-emerald-600' : item.marginPersen >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                            {item.marginPersen >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {item.marginPersen.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LaporanHppPage;
