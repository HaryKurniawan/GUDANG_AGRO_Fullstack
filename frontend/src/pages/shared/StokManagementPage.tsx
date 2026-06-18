import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Package,
  Edit2,
  Check,
  Loader2,
  X,
  AlertCircle,
  Boxes,
  Weight,
  Filter,
  Sprout,
  Send,
} from 'lucide-react';

interface KemasanItem {
  id: string;
  ukuranKg: number;
  stokKemasan: number;
}

interface ProdukStok {
  id: string;
  nama: string;
  deskripsi: string | null;
  satuan: string;
  hargaGudang: number;
  stok: number;
  gudangId: string;
  gudang: { id: string; kode: string; nama: string };
  kemasan: KemasanItem[];
  masterKomoditas?: { kodeKomoditasGlobal?: string | null } | null;
  kodeKomoditasGlobal?: string | null;
}

const StokManagementPage: React.FC = () => {
  const [products, setProducts] = useState<ProdukStok[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGudang, setFilterGudang] = useState('');
  const [filterTab, setFilterTab] = useState<'semua' | 'curah' | 'kemasan'>('semua');

  // Edit stok modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdukStok | null>(null);
  const [newStok, setNewStok] = useState<number>(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Kemasan modal
  const [kemasanModalOpen, setKemasanModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProdukStok | null>(null);
  const [kemasanOp, setKemasanOp] = useState<'kemaskan' | 'bongkar'>('kemaskan');
  const [kemasanUkuran, setKemasanUkuran] = useState<number>(1.0);
  const [customUkuranEnabled, setCustomUkuranEnabled] = useState(false);
  const [customUkuran, setCustomUkuran] = useState<string>('');
  const [kemasanJumlah, setKemasanJumlah] = useState<number>(0);
  const [kemasanError, setKemasanError] = useState('');
  const [kemasanSuccess, setKemasanSuccess] = useState('');
  const [kemasanSubmitting, setKemasanSubmitting] = useState(false);

  // Modal minta ke petani (permintaan pengadaan)
  const [petaniModalOpen, setPetaniModalOpen] = useState(false);
  const [petaniProduct, setPetaniProduct] = useState<ProdukStok | null>(null);
  const [petaniForm, setPetaniForm] = useState({ targetKg: '', hargaAcuanPerKg: '', deadlinePanen: '', catatan: '' });
  const [petaniError, setPetaniError] = useState('');
  const [petaniSuccess, setPetaniSuccess] = useState('');
  const [petaniSubmitting, setPetaniSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/produk/staf');
      setProducts(response.data.data || []);
      if (response.data.data?.length > 0 && !filterGudang) {
        setFilterGudang(response.data.data[0].gudangId);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Filtered products
  const warehouses = Array.from(new Map(products.map(p => [p.gudangId, p.gudang])).values());
  const filtered = products.filter(p => {
    if (filterGudang && p.gudangId !== filterGudang) return false;
    if (filterTab === 'curah') return (p.stok || 0) > 0;
    if (filterTab === 'kemasan') return (p.kemasan || []).some(k => k.stokKemasan > 0);
    return true;
  });

  // Stats
  const allFiltered = products.filter(p => !filterGudang || p.gudangId === filterGudang);
  const totalBulk = allFiltered.reduce((s, p) => s + (p.stok || 0), 0);
  const totalKemasan = allFiltered.reduce((s, p) => s + (p.kemasan || []).reduce((ks, k) => ks + k.ukuranKg * k.stokKemasan, 0), 0);
  const totalFisik = totalBulk + totalKemasan;
  const lowStok = allFiltered.filter(p => {
    const t = (p.stok || 0) + (p.kemasan || []).reduce((ks, k) => ks + k.ukuranKg * k.stokKemasan, 0);
    return t > 0 && t < 10;
  });

  // Edit stok handlers
  const openEditModal = (prod: ProdukStok) => {
    setEditingProduct(prod);
    setNewStok(prod.stok || 0);
    setError(''); setSuccess('');
    setModalOpen(true);
  };

  const handleUpdateStok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      if (newStok < 0) throw new Error('Stok tidak boleh negatif.');
      await api.patch(`/produk/admin/${editingProduct.id}`, {
        gudangId: editingProduct.gudangId,
        nama: editingProduct.nama,
        deskripsi: editingProduct.deskripsi,
        satuan: editingProduct.satuan,
        hargaGudang: editingProduct.hargaGudang,
        stok: Number(newStok),
      });
      setSuccess('Stok berhasil diperbarui.');
      await fetchProducts();
      setTimeout(() => setModalOpen(false), 800);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gagal memperbarui stok.');
    } finally { setSubmitting(false); }
  };

  // Kemasan handlers
  const openKemasanModal = (prod: ProdukStok) => {
    setSelectedProduct(prod);
    setKemasanOp('kemaskan'); setKemasanUkuran(1.0);
    setCustomUkuranEnabled(false); setCustomUkuran('');
    setKemasanJumlah(0); setKemasanError(''); setKemasanSuccess('');
    setKemasanModalOpen(true);
  };

  const handleKelolaKemasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setKemasanError(''); setKemasanSuccess(''); setKemasanSubmitting(true);
    try {
      const finalUkuran = customUkuranEnabled ? Number(customUkuran) : kemasanUkuran;
      if (isNaN(finalUkuran) || finalUkuran <= 0) throw new Error('Ukuran kemasan harus > 0.');
      if (kemasanJumlah <= 0) throw new Error('Jumlah kemasan harus > 0.');

      const endpoint = kemasanOp === 'kemaskan' ? '/kemasan/kemaskan' : '/kemasan/bongkar';
      const response = await api.post(endpoint, {
        produkGudangId: selectedProduct.id,
        ukuranKg: finalUkuran,
        jumlahKemasan: Number(kemasanJumlah),
      });
      setKemasanSuccess(response.data.message || 'Operasi kemasan berhasil.');
      await fetchProducts();
      setTimeout(() => setKemasanModalOpen(false), 1000);
    } catch (err: any) {
      setKemasanError(err.response?.data?.message || err.message || 'Gagal.');
    } finally { setKemasanSubmitting(false); }
  };

  // Minta ke petani (permintaan pengadaan)
  const openPetaniModal = (prod: ProdukStok) => {
    setPetaniProduct(prod);
    setPetaniForm({
      targetKg: '',
      hargaAcuanPerKg: prod.hargaGudang ? String(prod.hargaGudang) : '',
      deadlinePanen: '',
      catatan: `Pengadaan ${prod.nama} untuk restok gudang ${prod.gudang?.nama || ''}`,
    });
    setPetaniError(''); setPetaniSuccess('');
    setPetaniModalOpen(true);
  };

  const handleMintaPetani = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petaniProduct) return;
    setPetaniError(''); setPetaniSuccess('');
    const target = parseFloat(petaniForm.targetKg) || 0;
    if (target <= 0) { setPetaniError('Target kebutuhan harus lebih dari 0 kg.'); return; }

    try {
      setPetaniSubmitting(true);
      // 1. Buat permintaan pengadaan (DRAFT)
      const createRes = await api.post('/permintaan-pengadaan', {
        gudangId: petaniProduct.gudangId,
        komoditasNama: petaniProduct.nama,
        kodeKomoditasGlobal: petaniProduct.masterKomoditas?.kodeKomoditasGlobal || petaniProduct.kodeKomoditasGlobal || undefined,
        targetKg: target,
        hargaAcuanPerKg: petaniForm.hargaAcuanPerKg || undefined,
        deadlinePanen: petaniForm.deadlinePanen || undefined,
        catatan: petaniForm.catatan || undefined,
      });
      const ppId = createRes.data?.data?.id;
      if (!ppId) throw new Error('Gagal membuat permintaan pengadaan.');

      // 2. Langsung kirim ke PETANI
      await api.post(`/permintaan-pengadaan/${ppId}/kirim`, {});

      setPetaniSuccess(`Permintaan ${target} kg ${petaniProduct.nama} berhasil dikirim ke kepala petani.`);
      setTimeout(() => setPetaniModalOpen(false), 1200);
    } catch (err: any) {
      setPetaniError(err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal mengirim permintaan.');
    } finally { setPetaniSubmitting(false); }
  };

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
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen Stok Gudang</h1>
        <p className="text-xs text-slate-400 mt-0.5">Kelola stok curah dan kemasan produk</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Stok Curah (Bulk)</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalBulk.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Weight className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Belum dikemas, masih dalam bentuk curah</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Stok Terkemas</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{totalKemasan.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Boxes className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Sudah dikemas dalam berbagai ukuran</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Stok Fisik</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{totalFisik.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">kg</span></p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Curah + Kemasan total semua produk</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStok.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-700">Stok Rendah</p>
            <p className="text-[11px] text-red-600 mt-0.5">{lowStok.length} produk memiliki stok &lt; 10 kg: {lowStok.map(p => p.nama).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Warehouse filter */}
        {warehouses.length > 1 && (
          <select
            value={filterGudang}
            onChange={(e) => setFilterGudang(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Semua Gudang</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>{w.nama}</option>
            ))}
          </select>
        )}

        {/* Tab filter */}
        <div className="flex gap-1">
          {([
            { key: 'semua', label: 'Semua' },
            { key: 'curah', label: 'Curah (Belum Kemas)' },
            { key: 'kemasan', label: 'Sudah Dikemas' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterTab === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 ml-auto">
          <Filter size={11} className="inline mr-1" />
          {filtered.length} produk
        </span>
      </div>

      {/* Product Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Tidak ada produk yang cocok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prod) => {
            const stokBulk = prod.stok || 0;
            const kemasanItems = prod.kemasan || [];
            const totalKemasanKg = kemasanItems.reduce((s, k) => s + k.ukuranKg * k.stokKemasan, 0);
            const totalProduk = stokBulk + totalKemasanKg;
            const isLow = totalProduk > 0 && totalProduk < 10;

            return (
              <div key={prod.id} className={`bg-white border rounded-2xl p-4 ${isLow ? 'border-red-200' : 'border-slate-100'}`}>
                {/* Top row: product info + actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{prod.nama}</h3>
                      {isLow && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">RENDAH</span>}
                    </div>
                    {prod.deskripsi && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{prod.deskripsi}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-slate-400">Satuan: <span className="font-semibold text-slate-600">{prod.satuan}</span></span>
                      <span className="text-[10px] text-slate-400">Harga: <span className="font-semibold text-amber-600">Rp {prod.hargaGudang.toLocaleString('id-ID')}/{prod.satuan}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Edit2 size={11} /> Edit Bulk
                    </button>
                    <button
                      onClick={() => openKemasanModal(prod)}
                      className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Package size={11} /> Kemas
                    </button>
                    <button
                      onClick={() => openPetaniModal(prod)}
                      className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Sprout size={11} /> Minta ke Petani
                    </button>
                  </div>
                </div>

                {/* Stock breakdown */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {/* Curah */}
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-emerald-600 font-semibold uppercase">Curah</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">{stokBulk.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-emerald-500">kg (belum dikemas)</p>
                  </div>

                  {/* Kemasan */}
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-amber-600 font-semibold uppercase">Terkemas</p>
                    <p className="text-base font-bold text-amber-700 mt-0.5">{totalKemasanKg.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-amber-500">kg total kemasan</p>
                  </div>

                  {/* Total */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-blue-600 font-semibold uppercase">Total Fisik</p>
                    <p className={`text-base font-bold mt-0.5 ${isLow ? 'text-red-600' : 'text-blue-700'}`}>{totalProduk.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-blue-500">kg semua jenis</p>
                  </div>
                </div>

                {/* Kemasan detail breakdown */}
                {kemasanItems.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-50">
                    <p className="text-[9px] text-slate-400 font-semibold uppercase mb-1.5">Detail Kemasan:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {kemasanItems.map((k) => (
                        <span
                          key={k.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border ${
                            k.stokKemasan > 0
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Boxes size={10} />
                          <span className="font-bold">{k.ukuranKg} kg</span>
                          <span className="text-slate-400">×</span>
                          <span className="font-bold">{k.stokKemasan}</span> pack
                          <span className="text-slate-300 ml-1">= {(k.ukuranKg * k.stokKemasan).toLocaleString('id-ID')} kg</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Update Stok Bulk */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 relative space-y-4 shadow-xl">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Update Stok Curah (Bulk)</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editingProduct.nama}</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{error}</div>}
            {success && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 font-medium flex items-center gap-1.5"><Check size={14} />{success}</div>}

            <form onSubmit={handleUpdateStok} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                  Stok Curah Saat Ini: {editingProduct.stok || 0} {editingProduct.satuan}
                </label>
                <input
                  type="number" required min="0"
                  value={newStok}
                  onChange={(e) => setNewStok(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Stok Lama:</span><span className="font-bold text-slate-600">{editingProduct.stok || 0} kg</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Stok Baru:</span><span className="font-bold text-emerald-600">{newStok} kg</span></div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between">
                  <span className="text-slate-400">Selisih:</span>
                  <span className={`font-bold ${newStok > (editingProduct.stok || 0) ? 'text-emerald-600' : newStok < (editingProduct.stok || 0) ? 'text-red-600' : 'text-slate-400'}`}>
                    {newStok > (editingProduct.stok || 0) ? '+' : ''}{newStok - (editingProduct.stok || 0)} kg
                  </span>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Kelola Kemasan */}
      {kemasanModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 relative space-y-4 shadow-xl">
            <button onClick={() => setKemasanModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Kelola Kemasan</h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.nama} • Stok Curah: {selectedProduct.stok} kg</p>
            </div>

            {/* Operation tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setKemasanOp('kemaskan'); setKemasanError(''); setKemasanSuccess(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${kemasanOp === 'kemaskan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Kemaskan (Curah → Pack)
              </button>
              <button
                type="button"
                onClick={() => { setKemasanOp('bongkar'); setKemasanError(''); setKemasanSuccess(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${kemasanOp === 'bongkar' ? 'bg-red-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Bongkar (Pack → Curah)
              </button>
            </div>

            {kemasanError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{kemasanError}</div>}
            {kemasanSuccess && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 font-medium flex items-center gap-1.5"><Check size={14} />{kemasanSuccess}</div>}

            <form onSubmit={handleKelolaKemasan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Ukuran (kg/pack)</label>
                  {!customUkuranEnabled ? (
                    <select
                      value={kemasanUkuran}
                      onChange={(e) => e.target.value === 'custom' ? setCustomUkuranEnabled(true) : setKemasanUkuran(parseFloat(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="0.5">0.5 kg</option>
                      <option value="1">1 kg (Retail)</option>
                      <option value="2.5">2.5 kg</option>
                      <option value="5">5 kg</option>
                      <option value="10">10 kg</option>
                      <option value="25">25 kg (Karung)</option>
                      <option value="50">50 kg (Karung Besar)</option>
                      <option value="custom">Ukuran Kustom...</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="number" step="0.1" min="0.1" required
                        value={customUkuran}
                        onChange={(e) => setCustomUkuran(e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        placeholder="kg"
                      />
                      <button type="button" onClick={() => setCustomUkuranEnabled(false)} className="px-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold">×</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Jumlah Pack</label>
                  <input
                    type="number" required min="1"
                    value={kemasanJumlah || ''}
                    onChange={(e) => setKemasanJumlah(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Berapa pack"
                  />
                </div>
              </div>

              {/* Calculation preview */}
              {(() => {
                const finalUkuran = customUkuranEnabled ? Number(customUkuran) : kemasanUkuran;
                const totalKg = finalUkuran * kemasanJumlah;
                const valid = !isNaN(finalUkuran) && finalUkuran > 0 && kemasanJumlah > 0;
                const existingPack = (selectedProduct.kemasan || []).find(k => k.ukuranKg === finalUkuran);
                const existingCount = existingPack?.stokKemasan || 0;

                if (kemasanOp === 'kemaskan') {
                  const bulkAfter = (selectedProduct.stok || 0) - totalKg;
                  const packAfter = existingCount + kemasanJumlah;
                  const insufficient = (selectedProduct.stok || 0) < totalKg;

                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase">Estimasi</p>
                      <div className="flex justify-between"><span className="text-slate-400">Operasi:</span><span className="font-bold text-slate-700">{valid ? kemasanJumlah : 0} pack × {finalUkuran} kg = {valid ? totalKg : 0} kg</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Curah setelah:</span><span className={`font-bold ${insufficient ? 'text-red-600' : 'text-emerald-600'}`}>{valid ? bulkAfter : selectedProduct.stok} kg</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Pack {finalUkuran}kg setelah:</span><span className="font-bold text-amber-600">{valid ? packAfter : existingCount} pack</span></div>
                      {insufficient && valid && <p className="text-[10px] text-red-600 font-semibold mt-1">⚠️ Stok curah tidak cukup!</p>}
                    </div>
                  );
                } else {
                  const packAfter = existingCount - kemasanJumlah;
                  const bulkAfter = (selectedProduct.stok || 0) + totalKg;
                  const insufficient = existingCount < kemasanJumlah;

                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase">Estimasi</p>
                      <div className="flex justify-between"><span className="text-slate-400">Operasi:</span><span className="font-bold text-slate-700">{valid ? kemasanJumlah : 0} pack × {finalUkuran} kg = {valid ? totalKg : 0} kg</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Pack {finalUkuran}kg setelah:</span><span className={`font-bold ${insufficient ? 'text-red-600' : 'text-amber-600'}`}>{valid ? packAfter : existingCount} pack</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Curah setelah:</span><span className="font-bold text-emerald-600">{valid ? bulkAfter : selectedProduct.stok} kg</span></div>
                      {insufficient && valid && <p className="text-[10px] text-red-600 font-semibold mt-1">⚠️ Pack tidak cukup untuk dibongkar!</p>}
                    </div>
                  );
                }
              })()}

              <button type="submit" disabled={kemasanSubmitting} className={`w-full py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50 ${kemasanOp === 'kemaskan' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
                {kemasanSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : kemasanOp === 'kemaskan' ? 'Kemaskan Sekarang' : 'Bongkar Kemasan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Minta ke Kepala Petani */}
      {petaniModalOpen && petaniProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl relative shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-4 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                <Sprout className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">Minta Pengadaan ke Kepala Petani</h3>
                <p className="text-[11px] text-emerald-50/80 truncate">{petaniProduct.nama} · {petaniProduct.gudang?.nama}</p>
              </div>
              <button onClick={() => setPetaniModalOpen(false)} className="p-1.5 text-white/80 hover:text-white rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleMintaPetani} className="p-5 space-y-4">
              {/* Info stok saat ini */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex justify-between">
                <span className="text-slate-400">Total stok fisik saat ini</span>
                <span className="font-bold text-slate-700">
                  {((petaniProduct.stok || 0) + (petaniProduct.kemasan || []).reduce((s, k) => s + k.ukuranKg * k.stokKemasan, 0)).toLocaleString('id-ID')} kg
                </span>
              </div>

              {petaniError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{petaniError}</div>}
              {petaniSuccess && <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 font-medium flex items-center gap-1.5"><Check size={14} />{petaniSuccess}</div>}

              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Target Kebutuhan (kg) *</label>
                <div className="relative">
                  <input
                    type="number" min="1" step="1" required
                    value={petaniForm.targetKg}
                    onChange={(e) => setPetaniForm((p) => ({ ...p, targetKg: e.target.value }))}
                    placeholder="mis. 500"
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400">kg</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Harga Acuan per kg (opsional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">Rp</span>
                  <input
                    type="number" min="0" step="100"
                    value={petaniForm.hargaAcuanPerKg}
                    onChange={(e) => setPetaniForm((p) => ({ ...p, hargaAcuanPerKg: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Target Deadline Panen (opsional)</label>
                <input
                  type="date"
                  value={petaniForm.deadlinePanen}
                  onChange={(e) => setPetaniForm((p) => ({ ...p, deadlinePanen: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={petaniForm.catatan}
                  onChange={(e) => setPetaniForm((p) => ({ ...p, catatan: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={petaniSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {petaniSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={14} />}
                Kirim ke Kepala Petani
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StokManagementPage;
