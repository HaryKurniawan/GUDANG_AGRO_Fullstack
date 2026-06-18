import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Loader2,
  Leaf,
  Tag,
  Info,
} from 'lucide-react';

interface Komoditas {
  id: string;
  nama: string;
  kategori: string | null;
  satuan: string;
  harga: number;
  deskripsi: string | null;
  isActive: boolean;
  kodeKomoditasGlobal: string | null;
}

const HargaPenerimaanPage: React.FC = () => {
  const [komoditas, setKomoditas] = useState<Komoditas[]>([]);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');

  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch master komoditas lokal Gudang
      const resGudang = await api.get('/master-komoditas/admin');
      let localKomoditas = resGudang.data.data || [];
      
      // Fetch harga terbaru dari Petani
      try {
        const resPetani = await api.get('/harga-petani');
        const petaniKomoditas = resPetani.data.komoditas || [];
        
        // Merge harga dari Petani ke lokal Gudang berdasarkan nama atau kode global
        localKomoditas = localKomoditas.map((k: any) => {
          const match = petaniKomoditas.find((pk: any) => 
            pk.id === k.nama || pk.nama === k.nama || pk.kodeKomoditasGlobal === k.kodeKomoditasGlobal
          );
          if (match) {
            k.harga = match.hargaSaatIni;
          }
          return k;
        });
      } catch (err) {
        console.error('Gagal menarik harga dari Petani:', err);
      }
      
      setKomoditas(localKomoditas);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Computed
  const categories = Array.from(new Set(komoditas.map(k => k.kategori).filter(Boolean)));
  const filtered = komoditas.filter(k => {
    const matchSearch = !search || k.nama.toLowerCase().includes(search.toLowerCase());
    const matchKat = !filterKategori || k.kategori === filterKategori;
    return matchSearch && matchKat;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Daftar Harga Penerimaan</h1>
          <p className="text-xs text-slate-400 mt-0.5">Atur harga beli per komoditas yang akan dilihat oleh petani saat mengajukan jual panen</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="bg-white border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-50 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
        >
          <Loader2 size={14} className={loading ? 'animate-spin' : ''} />
          Sinkronisasi Harga
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          Daftar harga di bawah ini diatur secara terpusat oleh Admin Petani.
          Harga ini akan menjadi <strong>harga acuan</strong> yang dilihat petani saat mengajukan jual panen ke gudang.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Cari komoditas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <select
          value={filterKategori}
          onChange={e => setFilterKategori(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
        >
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c!} value={c!}>{c}</option>)}
        </select>
      </div>

      {/* Komoditas List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Leaf className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Tidak ada komoditas ditemukan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((k) => {
            return (
              <div
                key={k.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 transition-all hover:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Leaf size={16} className="text-emerald-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{k.nama}</span>
                      {k.kategori && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{k.kategori}</span>
                      )}
                      {!k.isActive && (
                        <span className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">Nonaktif</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Satuan: {k.satuan}</p>
                  </div>

                  {/* Harga */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Tag size={10} className="text-slate-300" />
                        {k.harga > 0 ? (
                          <span className="text-sm font-bold text-emerald-600">
                            Rp {k.harga.toLocaleString('id-ID')}/{k.satuan}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Harga belum diatur</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HargaPenerimaanPage;
