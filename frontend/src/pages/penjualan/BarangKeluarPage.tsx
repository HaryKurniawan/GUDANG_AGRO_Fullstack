import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Truck,
  Search,
  Loader2,
  Warehouse,
  Store,
  Package,
  Calendar,
} from 'lucide-react';

interface PenjualanKeluar {
  id: string;
  nomorPenjualan: string;
  komoditasNama: string;
  beratKg: number;
  hargaPerKg: number;
  totalNilai: number;
  tujuanPenjualan: string;
  jenisPembeli: string;
  petaniNama: string | null;
  tanggalPenjualan: string;
  status: string;
  gudang?: { id: string; nama: string; kode: string };
}

const BarangKeluarPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PenjualanKeluar[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/penjualan-keluar');
        setData(res.data.data || []);
      } catch (error) {
        console.error('Error fetching barang keluar:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = data.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.komoditasNama.toLowerCase().includes(q) ||
      item.tujuanPenjualan.toLowerCase().includes(q) ||
      item.nomorPenjualan.toLowerCase().includes(q) ||
      (item.gudang?.nama || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-5 h-5 text-green-600" />
          Barang Keluar
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Daftar barang yang terkirim dari gudang ke seller/pembeli.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari komoditas, tujuan, atau nomor penjualan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-500"
        />
      </div>

      <p className="text-xs text-slate-400">{filtered.length} barang keluar</p>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
          <Truck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Belum ada barang keluar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-100 rounded-xl p-4 w-full hover:border-green-200 transition-colors"
            >
              {/* Top Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 p-2 rounded-lg">
                    <Package className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{item.komoditasNama}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{item.nomorPenjualan}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  item.status === 'TERCATAT' ? 'bg-green-50 text-green-600'
                  : item.status === 'DIKIRIM' ? 'bg-blue-50 text-blue-600'
                  : 'bg-slate-50 text-slate-500'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Info Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Warehouse className="w-3.5 h-3.5 text-slate-300" />
                  <span className="truncate">{item.gudang?.nama || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Store className="w-3.5 h-3.5 text-slate-300" />
                  <span className="truncate">{item.tujuanPenjualan}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Package className="w-3.5 h-3.5 text-slate-300" />
                  <span>{item.beratKg} Kg</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  <span>{new Date(item.tanggalPenjualan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Bottom row - price */}
              {item.totalNilai > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Rp {item.hargaPerKg.toLocaleString()}/Kg</span>
                  <span className="font-semibold text-green-600">Rp {item.totalNilai.toLocaleString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BarangKeluarPage;
