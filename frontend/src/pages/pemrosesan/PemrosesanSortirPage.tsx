import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Loader2, Scissors, X, CheckCircle } from 'lucide-react';

interface PemrosesanItem {
  id: string;
  penerimaanId: string;
  komoditasNama: string;
  beratMasukKg: number;
  createdAt: string;
}

const PemrosesanSortirPage: React.FC = () => {
  const [items, setItems] = useState<PemrosesanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PemrosesanItem | null>(null);
  const [form, setForm] = useState({ beratBersihKg: '', rejectKg: '', catatan: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await api.get('/pemrosesan', { params: { tahap: 'SORTIR' } });
      setItems(res.data.data || []);
    } catch (error) {
      console.error('Error fetching sortir items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      await api.patch(`/pemrosesan/${modal.id}/sortir`, form);
      setModal(null);
      setForm({ beratBersihKg: '', rejectKg: '', catatan: '' });
      fetchItems();
    } catch (error) {
      console.error('Error completing sortir:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm font-medium">Memuat data sortir...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
          <Scissors className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Sortir & Cuci</h2>
          <p className="text-xs text-slate-500">Barang menunggu proses sortir dan pembersihan</p>
        </div>
        <span className="ml-auto bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
          {items.length} item
        </span>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Semua barang sudah disortir</p>
          <p className="text-xs text-slate-400 mt-1">Tidak ada antrian sortir saat ini</p>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800">{item.komoditasNama}</h4>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="text-xs text-slate-500">Berat masuk: <strong className="text-slate-700">{item.beratMasukKg} Kg</strong></span>
                <span className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setModal(item); setForm({ beratBersihKg: '', rejectKg: '', catatan: '' }); }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Selesaikan Sortir
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Selesaikan Sortir</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
              <strong>{modal.komoditasNama}</strong> — {modal.beratMasukKg} Kg masuk
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Berat Bersih (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.beratBersihKg}
                  onChange={(e) => setForm({ ...form, beratBersihKg: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Berat setelah sortir & cuci"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Berat Reject (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.rejectKg}
                  onChange={(e) => setForm({ ...form, rejectKg: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Berat yang di-reject"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan (opsional)</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
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
                disabled={submitting || !form.beratBersihKg}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {submitting ? 'Menyimpan...' : 'Simpan & Lanjut'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PemrosesanSortirPage;
