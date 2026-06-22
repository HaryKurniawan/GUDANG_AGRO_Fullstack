/**
 * ProdukJualPage — Penjualan Gudang
 *
 * Alur:
 * 1. Tampilkan daftar Master Komoditas aktif (tab Katalog)
 * 2. Kepala gudang klik "Tambah ke Penjualan" → isi varian & harga
 * 3. Produk masuk ke daftar ProdukGudang (tab Produk Dijual)
 * 4. Seller ECOMMERCE bisa lihat katalog ini dan ajukan stok
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  Plus,
  Loader2,
  Check,
  Trash2,
  Edit2,
  AlertCircle,
  Store,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterKomoditas {
  id: string;
  nama: string;
  kategori?: string;
  satuan: string;
  harga: number;
  deskripsi?: string;
  gambarUrl?: string;
  kodeKomoditasGlobal?: string;
  isActive: boolean;
  _count?: { produkGudang: number };
}

interface ProdukGudang {
  id: string;
  nama: string;
  varianProduk?: string | null;
  satuan: string;
  hargaGudang: number;
  stok: number;
  minimalPembelianKg?: number;
  deskripsi?: string;
  isActive: boolean;
  masterKomoditasId?: string;
  masterKomoditas?: {
    id: string;
    nama: string;
    kategori?: string;
    kodeKomoditasGlobal?: string;
  };
}

// ─── Modal: Tambahkan ke Penjualan ───────────────────────────────────────────

interface ModalTambahProps {
  komoditas: MasterKomoditas;
  gudangId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const ModalTambah: React.FC<ModalTambahProps> = ({ komoditas, gudangId, onSuccess, onClose }) => {
  const [harga, setHarga] = useState(komoditas.harga.toString());
  const [minBeli, setMinBeli] = useState('300');
  const [varian, setVarian] = useState('');
  const [varianOptions, setVarianOptions] = useState<{ id: string; nama: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/varian/master/active')
      .then((res) => setVarianOptions(res.data?.data || []))
      .catch(() => setVarianOptions([]));
  }, []);

  const namaLengkap = varian.trim() ? `${komoditas.nama} ${varian.trim()}` : komoditas.nama;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!harga || parseFloat(harga) < 0) {
      setError('Harga tidak valid');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/produk/admin', {
        gudangId,
        masterKomoditasId: komoditas.id,
        stok: 0,
        hargaGudang: parseFloat(harga),
        minimalPembelianKg: parseFloat(minBeli) || 300,
        varianProduk: varian.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan produk');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        {/* Preview */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5">
          <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold mb-1">
            Menambahkan ke penjualan
          </p>
          <h3 className="font-bold text-lg text-slate-800">{namaLengkap}</h3>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-emerald-100">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Kategori</p>
              <p className="text-sm font-medium text-slate-800 capitalize">{komoditas.kategori || '-'}</p>
            </div>
            <span className="text-slate-300">·</span>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Komoditas Dasar</p>
              <p className="text-sm font-bold text-emerald-700">{komoditas.nama}</p>
            </div>
            {komoditas.kodeKomoditasGlobal && (
              <>
                <span className="text-slate-300">·</span>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Kode</p>
                  <p className="font-mono text-emerald-700 text-[11px]">{komoditas.kodeKomoditasGlobal}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Varian opsional — dropdown dari Master Varian (dikelola admin) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Varian Produk <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <select
              value={varian}
              onChange={(e) => setVarian(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Tanpa varian (dijual apa adanya)</option>
              {varianOptions.map((v) => (
                <option key={v.id} value={v.nama}>{v.nama}</option>
              ))}
            </select>
            {varian.trim() && (
              <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                <Check size={11} /> Nama produk: <strong>{namaLengkap}</strong>
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Varian hanya bisa dipilih dari daftar yang disetujui admin. Butuh varian baru?
              Ajukan di menu <strong>Pengajuan Varian</strong>.
            </p>
          </div>

          {/* Harga */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Harga Jual ({komoditas.satuan}) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Rp</span>
              <input
                type="number"
                min="0"
                step="100"
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
              <span className="text-slate-500 text-sm">/ {komoditas.satuan}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Default dari master: <strong>Rp {(komoditas.harga || 0).toLocaleString('id-ID')}</strong>
            </p>
          </div>

          {/* Minimal Pembelian */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Minimal Pembelian Seller ({komoditas.satuan}) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={minBeli}
                onChange={(e) => setMinBeli(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
              <span className="text-slate-500 text-sm">{komoditas.satuan} / pengajuan</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Seller wajib mengajukan minimal sebanyak ini per produk.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {submitting ? 'Menambahkan...' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Edit Stok, Harga & Varian ────────────────────────────────────────

interface ModalEditProps {
  produk: ProdukGudang;
  onSuccess: () => void;
  onClose: () => void;
}

const ModalEdit: React.FC<ModalEditProps> = ({ produk, onSuccess, onClose }) => {
  const [stok, setStok] = useState(produk.stok.toString());
  const [harga, setHarga] = useState(produk.hargaGudang.toString());
  const [minBeli, setMinBeli] = useState((produk.minimalPembelianKg ?? 300).toString());
  const [varian, setVarian] = useState(produk.varianProduk || '');
  const [varianOptions, setVarianOptions] = useState<{ id: string; nama: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/varian/master/active')
      .then((res) => setVarianOptions(res.data?.data || []))
      .catch(() => setVarianOptions([]));
  }, []);

  const namaBase = produk.masterKomoditas?.nama || produk.nama;
  const namaLengkap = varian.trim() ? `${namaBase} ${varian.trim()}` : namaBase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/produk/admin/${produk.id}`, {
        stok: parseFloat(stok),
        hargaGudang: parseFloat(harga),
        minimalPembelianKg: parseFloat(minBeli) || 300,
        varianProduk: varian.trim() || null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memperbarui');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="mb-5">
          <h3 className="font-bold text-lg text-slate-800">Edit Produk</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Komoditas dasar: <span className="font-semibold text-emerald-700">{namaBase}</span>
          </p>
          {varian.trim() && (
            <p className="text-xs text-emerald-700 font-medium mt-1">
              → Nama tampil: <strong>{namaLengkap}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Varian — dropdown dari Master Varian */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Varian Produk <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <select
              value={varian}
              onChange={(e) => setVarian(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Tanpa varian (dijual apa adanya)</option>
              {/* Pastikan varian lama tetap muncul walau sudah nonaktif di master */}
              {varian && !varianOptions.some((v) => v.nama === varian) && (
                <option value={varian}>{varian} (lama)</option>
              )}
              {varianOptions.map((v) => (
                <option key={v.id} value={v.nama}>{v.nama}</option>
              ))}
            </select>
          </div>

          {/* Stok */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Stok ({produk.satuan})
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={stok}
              onChange={(e) => setStok(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Harga */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Harga Gudang (Rp/{produk.satuan})
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Minimal Pembelian */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Minimal Pembelian Seller ({produk.satuan})
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={minBeli}
              onChange={(e) => setMinBeli(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">Seller wajib mengajukan minimal sebanyak ini per produk.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Katalog Picker Form (Dropdown Style) ─────────────────────────────────────

interface KatalogPickerFormProps {
  komoditasList: MasterKomoditas[];
  produkList: ProdukGudang[];
  gudangId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const KatalogPickerForm: React.FC<KatalogPickerFormProps> = ({ komoditasList, produkList, gudangId, onSuccess, onClose }) => {
  const [selectedKomoditasId, setSelectedKomoditasId] = useState('');
  const [varian, setVarian] = useState('');
  const [varianOptions, setVarianOptions] = useState<{ id: string; nama: string }[]>([]);
  const [harga, setHarga] = useState('');
  const [minBeli, setMinBeli] = useState('300');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch varian options from admin
  useEffect(() => {
    api.get('/varian/master/active')
      .then((res) => setVarianOptions(res.data?.data || []))
      .catch(() => setVarianOptions([]));
  }, []);

  // Filter out komoditas that already have a produk (tanpa varian) in the list
  const availableKomoditas = komoditasList.filter((k) => {
    // Allow adding if this komoditas doesn't exist yet at all, or if it exists but user wants a different varian
    const existingProducts = produkList.filter((p) => p.masterKomoditasId === k.id);
    // If it has no products yet → show it
    if (existingProducts.length === 0) return true;
    // If it has products but they all have varian → still show (user can add tanpa varian or another varian)
    return true;
  });

  const selectedKomoditas = komoditasList.find((k) => k.id === selectedKomoditasId);

  // When komoditas changes, set default harga
  useEffect(() => {
    if (selectedKomoditas) {
      setHarga(selectedKomoditas.harga.toString());
    }
  }, [selectedKomoditasId]);

  // Check if this exact komoditas+varian combo already exists
  const isDuplicate = selectedKomoditasId && produkList.some(
    (p) => p.masterKomoditasId === selectedKomoditasId && (p.varianProduk || '') === varian.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKomoditasId) { setError('Pilih komoditas'); return; }
    if (!harga || parseFloat(harga) < 0) { setError('Harga tidak valid'); return; }
    if (isDuplicate) { setError('Komoditas + varian ini sudah ada di daftar penjualan'); return; }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/produk/admin', {
        gudangId,
        masterKomoditasId: selectedKomoditasId,
        stok: 0,
        hargaGudang: parseFloat(harga),
        minimalPembelianKg: parseFloat(minBeli) || 300,
        varianProduk: varian.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan produk');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-slate-800 mb-1">Tambah Produk yang Dijual</h3>
        <p className="text-xs text-slate-500 mb-5">Pilih komoditas dan varian, lalu atur harga jual.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropdown Komoditas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Komoditas *</label>
            <select
              value={selectedKomoditasId}
              onChange={(e) => setSelectedKomoditasId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              required
            >
              <option value="">-- Pilih Komoditas --</option>
              {availableKomoditas.map((k) => {
                const count = produkList.filter((p) => p.masterKomoditasId === k.id).length;
                return (
                  <option key={k.id} value={k.id}>
                    {k.nama} — Rp {(k.harga || 0).toLocaleString('id-ID')}/{k.satuan}
                    {count > 0 ? ` (${count} varian sudah ada)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Dropdown Varian */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Varian <span className="font-normal text-slate-400">(opsional, dari admin)</span>
            </label>
            <select
              value={varian}
              onChange={(e) => setVarian(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Tanpa varian (dijual apa adanya)</option>
              {varianOptions.map((v) => (
                <option key={v.id} value={v.nama}>{v.nama}</option>
              ))}
            </select>
            {selectedKomoditas && varian.trim() && (
              <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                <Check size={11} /> Nama produk: <strong>{selectedKomoditas.nama} {varian.trim()}</strong>
              </p>
            )}
          </div>

          {/* Duplicate warning */}
          {isDuplicate && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> Komoditas + varian ini sudah ada di daftar penjualan
            </div>
          )}

          {/* Harga */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Harga Jual (Rp/{selectedKomoditas?.satuan || 'kg'}) *</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Rp</span>
              <input
                type="number"
                min="0"
                step="100"
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
            </div>
            {selectedKomoditas && (
              <p className="text-[10px] text-slate-400 mt-1">Default dari master: Rp {(selectedKomoditas.harga || 0).toLocaleString('id-ID')}</p>
            )}
          </div>

          {/* Minimal Pembelian */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Minimal Pembelian Seller (kg)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={minBeli}
              onChange={(e) => setMinBeli(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || isDuplicate || !selectedKomoditasId}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {submitting ? 'Menambahkan...' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProdukJualPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const gudangId = user?.managedWarehouses?.[0]?.id || '';

  const [komoditasList, setKomoditasList] = useState<MasterKomoditas[]>([]);
  const [produkList, setProdukList] = useState<ProdukGudang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalEdit, setModalEdit] = useState<ProdukGudang | null>(null);
  const [showKatalogPicker, setShowKatalogPicker] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchKomoditas = useCallback(async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5005/api') + '/master-komoditas/public/all');
      const json = await res.json();
      setKomoditasList((json.data || []).filter((k: MasterKomoditas) => k.isActive));
    } catch (err) {
      console.error('Gagal memuat komoditas:', err);
    }
  }, []);

  const fetchProduk = useCallback(async () => {
    if (!gudangId) return;
    try {
      const res = await api.get('/produk/admin', { params: { gudangId } });
      setProdukList(res.data?.data || []);
    } catch (err) {
      console.error('Gagal memuat produk:', err);
    }
  }, [gudangId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchKomoditas(), fetchProduk()]);
      setLoading(false);
    };
    load();
  }, [fetchKomoditas, fetchProduk]);

  const handleTambahSuccess = async () => {
    setShowKatalogPicker(false);
    await fetchProduk();
  };

  const handleEditSuccess = async () => {
    setModalEdit(null);
    await fetchProduk();
  };

  const handleHapus = async (produk: ProdukGudang) => {
    const namaLengkap = produk.varianProduk ? `${produk.nama} ${produk.varianProduk}` : produk.nama;
    if (!confirm(`Hapus ${namaLengkap} dari daftar penjualan?`)) return;
    try {
      await api.delete(`/produk/admin/${produk.id}`);
      await fetchProduk();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filteredProduk = produkList.filter((p) => {
    const namaLengkap = p.varianProduk ? `${p.nama} ${p.varianProduk}` : p.nama;
    return namaLengkap.toLowerCase().includes(search.toLowerCase());
  });

  // ─── Render Konten Tab ────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      );
    }

    // Tab: Dijual
    return filteredProduk.length === 0 ? (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <Store size={36} className="mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 font-medium">Belum ada produk yang dijual</p>
        <p className="text-xs text-slate-400 mt-1">
          Klik <strong>"Tambah Produk"</strong> untuk menambahkan komoditas ke daftar penjualan.
        </p>
        {gudangId && (
          <button
            onClick={() => setShowKatalogPicker(true)}
            className="mt-4 text-sm text-emerald-600 font-semibold hover:underline"
          >
            → Tambah Produk Sekarang
          </button>
        )}
      </div>
    ) : (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">Produk</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500">Harga</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Stok</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProduk.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">
                    {p.nama}
                    {p.varianProduk && (
                      <span className="ml-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {p.varianProduk}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-400">{p.satuan}</p>
                    {p.masterKomoditas?.kategori && (
                      <p className="text-[10px] text-slate-400 capitalize">· {p.masterKomoditas.kategori}</p>
                    )}
                    {p.masterKomoditas?.kodeKomoditasGlobal && (
                      <p className="text-[10px] font-mono text-emerald-600">· {p.masterKomoditas.kodeKomoditasGlobal}</p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                  Rp {p.hargaGudang.toLocaleString('id-ID')}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    p.stok > 10
                      ? 'bg-green-50 text-green-700'
                      : p.stok > 0
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {p.stok} {p.satuan}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setModalEdit(p)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"
                      title="Edit stok & harga"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleHapus(p)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      title="Hapus dari penjualan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6">
        <span className="text-xs font-semibold tracking-wider uppercase text-green-100">
          Penjualan
        </span>
        <h2 className="text-xl font-bold mt-1 text-white">Produk yang Dijual Gudang</h2>
        <p className="text-xs mt-1.5 text-green-100 leading-relaxed">
          Pilih komoditas dari katalog → tambahkan varian jika perlu (misal: Frozen) → seller ECOMMERCE dapat melihat dan mengajukan stok.
        </p>
        {!gudangId && (
          <div className="mt-3 bg-yellow-500/20 border border-yellow-400/40 rounded-lg px-3 py-2 text-xs text-yellow-100">
            ⚠️ Gudang belum terdeteksi. Login sebagai Kepala Gudang untuk mengelola produk.
          </div>
        )}
      </div>

      {/* Header actions */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk..."
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        {gudangId && (
          <button
            onClick={() => setShowKatalogPicker(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all whitespace-nowrap"
          >
            <Plus size={15} /> Tambah Produk
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
          {renderContent()}

          {/* Info seller */}
          {produkList.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-2.5">
              <Store size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>{produkList.length} produk</strong> di atas dapat dilihat seller ECOMMERCE afiliasi untuk mengajukan stok.
                Seller mengajukan dari halaman <em>Pengajuan Stok → Beli dari Gudang</em> di dashboard mereka.
              </p>
            </div>
          )}
      </div>

      {/* Katalog Picker Modal — Dropdown Form */}
      {showKatalogPicker && (
        <KatalogPickerForm
          komoditasList={komoditasList}
          produkList={produkList}
          gudangId={gudangId}
          onSuccess={handleTambahSuccess}
          onClose={() => setShowKatalogPicker(false)}
        />
      )}

      {/* Modals */}
      {modalEdit && (
        <ModalEdit
          produk={modalEdit}
          onSuccess={handleEditSuccess}
          onClose={() => setModalEdit(null)}
        />
      )}
    </div>
  );
};

export default ProdukJualPage;
