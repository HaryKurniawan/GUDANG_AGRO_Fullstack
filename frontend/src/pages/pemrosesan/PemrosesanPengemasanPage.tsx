import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Loader2, Package, X, CheckCircle } from 'lucide-react';

interface PemrosesanItem {
  id: string;
  penerimaanId: string;
  komoditasNama: string;
  beratMasukKg: number;
  sortirBeratBersihKg: number | null;
  gradeA_Kg: number | null;
  gradeB_Kg: number | null;
  gradeC_Kg: number | null;
  createdAt: string;
}

const UKURAN_KEMASAN_OPTIONS = [
  { value: 1, label: '1 Kg (Retail)' },
  { value: 2.5, label: '2.5 Kg (Medium)' },
];

const PemrosesanPengemasanPage: React.FC = () => {
  const [items, setItems] = useState<PemrosesanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PemrosesanItem | null>(null);
  const [form, setForm] = useState({ ukuranKg: 1, jumlahKemasan: '', produkGudangId: '', catatan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [produkList, setProdukList] = useState<any[]>([]);

  const fetchItems = async () => {
    try {
      const res = await api.get('/pemrosesan', { params: { tahap: 'PENGEMASAN' } });
      setItems(res.data.data || []);
    } catch (error) {
      console.error('Error fetching pengemasan items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProduk = async () => {
    try {
      const res = await api.get('/produk/staf');
      setProdukList(res.data?.data || res.data || []);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => { fetchItems(); fetchProduk(); }, []);

  const handleSubmit = async () => {
    if (!modal || !form.jumlahKemasan) return;
    setSubmitting(true);
    try {
      // Otomatis cari produk gudang berdasarkan komoditasNama dari card
      const matchedProduk = produkList.find((p: any) =>
        p.nama?.toLowerCase().includes(modal.komoditasNama.toLowerCase())
      );
      if (!matchedProduk) {
        alert(`Produk gudang "${modal.komoditasNama}" tidak ditemukan di katalog. Pastikan produk sudah terdaftar.`);
        setSubmitting(false);
        return;
      }

      const beratDariPemrosesan = modal.sortirBeratBersihKg || modal.beratMasukKg || 0;

      // 1. Tambah stok bulk produk dari hasil pemrosesan (agar cukup untuk dikemas)
      await api.patch(`/produk/admin/${matchedProduk.id}`, {
        stok: (matchedProduk.stok || 0) + beratDariPemrosesan,
      });

      // 2. Kemaskan ke stok kemasan (sama seperti modal di halaman Stok)
      await api.post('/kemasan/kemaskan', {
        produkGudangId: matchedProduk.id,
        ukuranKg: form.ukuranKg,
        jumlahKemasan: Number(form.jumlahKemasan),
      });

      // 3. Update pemrosesan status ke selesai
      await api.patch(`/pemrosesan/${modal.id}/kemas`, {
        jumlahKemasan: form.jumlahKemasan,
        beratPerKemasan: String(form.ukuranKg),
        jenisKemasan: `${form.ukuranKg}kg`,
        catatan: form.catatan || `Dikemas ${form.jumlahKemasan} pack × ${form.ukuranKg}kg → ${matchedProduk.nama}`,
      });

      setModal(null);
      setForm({ ukuranKg: 1, jumlahKemasan: '', produkGudangId: '', catatan: '' });
      fetchItems();
      fetchProduk(); // refresh produk list
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyelesaikan pengemasan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm font-medium">Memuat data pengemasan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pengemasan</h2>
          <p className="text-xs text-slate-500">Barang menunggu proses pengemasan</p>
        </div>
        <span className="ml-auto bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full border border-purple-200">
          {items.length} item
        </span>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Semua barang sudah dikemas</p>
          <p className="text-xs text-slate-400 mt-1">Tidak ada antrian pengemasan saat ini</p>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800">{item.komoditasNama}</h4>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {item.gradeA_Kg && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">A: {item.gradeA_Kg} Kg</span>
                )}
                {item.gradeB_Kg && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">B: {item.gradeB_Kg} Kg</span>
                )}
                {item.gradeC_Kg && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">C: {item.gradeC_Kg} Kg</span>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const berat = item.sortirBeratBersihKg || item.beratMasukKg || 0;
                const autoPack = Math.floor(berat / 1); // default 1kg
                setModal(item);
                setForm({ ukuranKg: 1, jumlahKemasan: String(autoPack), produkGudangId: '', catatan: '' });
              }}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Selesaikan Kemas
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Selesaikan Pengemasan</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
              <strong>{modal.komoditasNama}</strong> · <span className="text-emerald-700 font-bold">{modal.sortirBeratBersihKg || modal.beratMasukKg} kg tersedia untuk dikemas</span>
              <div className="flex gap-2 mt-1">
                {modal.gradeA_Kg && <span>A: {modal.gradeA_Kg}Kg</span>}
                {modal.gradeB_Kg && <span>B: {modal.gradeB_Kg}Kg</span>}
                {modal.gradeC_Kg && <span>C: {modal.gradeC_Kg}Kg</span>}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ukuran Kemasan</label>
                <div className="flex gap-2">
                  {UKURAN_KEMASAN_OPTIONS.map((opt) => {
                    const beratTersedia = modal.sortirBeratBersihKg || modal.beratMasukKg || 0;
                    const autoPack = Math.floor(beratTersedia / opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, ukuranKg: opt.value, jumlahKemasan: String(autoPack) })}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          form.ukuranKg === opt.value
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {opt.label}
                        <span className="block text-[9px] mt-0.5 opacity-70">≈ {autoPack} pack</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah Pack *</label>
                <input
                  type="number"
                  min="1"
                  value={form.jumlahKemasan}
                  onChange={(e) => setForm({ ...form, jumlahKemasan: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Jumlah kemasan yang dibuat"
                />
                {form.jumlahKemasan && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Total: {Number(form.jumlahKemasan) * form.ukuranKg} kg → {form.jumlahKemasan} pack × {form.ukuranKg} kg
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan (opsional)</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  rows={2}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.jumlahKemasan}
                className="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {submitting ? 'Menyimpan...' : 'Selesaikan & Masuk Stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PemrosesanPengemasanPage;
