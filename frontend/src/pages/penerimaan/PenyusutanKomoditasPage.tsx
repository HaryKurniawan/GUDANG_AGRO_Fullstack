import React, { useEffect, useState } from 'react';
import { Leaf, Search, Percent, Loader2, Save, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface Komoditas {
  id: string;
  nama: string;
  kategori?: string;
  satuan: string;
  persenPenyusutan: number;
}

const PenyusutanKomoditasPage: React.FC = () => {
  const [komoditas, setKomoditas] = useState<Komoditas[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Simpan nilai input yang sedang diedit per baris
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchKomoditas = async () => {
    try {
      setLoading(true);
      setError(null);
      // Panggil endpoint list aktif
      const response = await api.get('/master-komoditas/staf/active');
      const data = response.data?.data || [];
      setKomoditas(data);

      // Inisialisasi state edit
      const initialEdits: Record<string, string> = {};
      data.forEach((item: Komoditas) => {
        initialEdits[item.id] = String(item.persenPenyusutan || 0);
      });
      setEditValues(initialEdits);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data komoditas. Pastikan Anda memiliki akses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKomoditas();
  }, []);

  const handleUpdate = async (item: Komoditas) => {
    const newVal = parseFloat(editValues[item.id] || '0');
    if (isNaN(newVal) || newVal < 0 || newVal > 100) {
      alert('Masukkan persentase penyusutan antara 0 hingga 100.');
      return;
    }

    try {
      setSavingId(item.id);
      setSuccessId(null);

      // Memanfaatkan endpoint PUT admin untuk update. Endpoint PUT membutuhkan field lain, 
      // jadi kita kirim data existing agar tidak hilang.
      await api.put(`/master-komoditas/admin/${item.id}`, {
        nama: item.nama,
        kategori: item.kategori,
        satuan: item.satuan,
        persenPenyusutan: newVal,
        isActive: true,
      });

      // Update state lokal
      setKomoditas((prev) =>
        prev.map((k) => (k.id === item.id ? { ...k, persenPenyusutan: newVal } : k))
      );
      
      setSuccessId(item.id);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan penyusutan';
      alert(`Gagal: ${msg}`);
    } finally {
      setSavingId(null);
    }
  };

  const filteredData = komoditas.filter((item) =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Percent className="w-6 h-6 text-emerald-600" />
          Pengaturan Penyusutan Komoditas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Atur persentase penyusutan (shrinkage) per komoditas. Nilai ini akan digunakan sebagai buffer otomatis saat Anda meneruskan pesanan ke petani.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Konten */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari komoditas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Tabel */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Memuat komoditas...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Leaf className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>Tidak ada komoditas yang ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">Komoditas</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Kategori</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Penyusutan (%)</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => {
                  const isSaving = savingId === item.id;
                  const isSuccess = successId === item.id;
                  const hasChanged = String(item.persenPenyusutan || 0) !== editValues[item.id];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{item.nama}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {item.kategori ? (
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                            {item.kategori}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative max-w-[120px]">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editValues[item.id] ?? ''}
                            onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: e.target.value }))}
                            className={`w-full pl-3 pr-8 py-2 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                              hasChanged ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-800'
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                            %
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUpdate(item)}
                          disabled={!hasChanged || isSaving}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : hasChanged
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isSuccess ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Tersimpan
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Simpan
                            </>
                          )}
                        </button>
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

export default PenyusutanKomoditasPage;
