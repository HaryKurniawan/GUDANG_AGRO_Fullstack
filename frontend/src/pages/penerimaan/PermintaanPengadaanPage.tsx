/**
 * Permintaan Pengadaan — Gudang Frontend
 *
 * Alur di halaman ini:
 * 1. Admin lihat "Sinyal Permintaan Pasar" (tren dari seller afiliasi)
 * 2. Pilih komoditas dari sinyal → buat Permintaan Pengadaan dengan targetKg & harga
 * 3. Kirim ke Kepala Petani terafiliasi dengan 1 klik
 * 4. Pantau komitmen yang masuk dari petani
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp, TrendingDown, Minus, Send, Plus, Package,
  CheckCircle2, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Users, Wheat, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API = 'http://localhost:5005/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DemandItem {
  komoditasNama: string;
  kodeKomoditasGlobal: string | null;
  masterProdukId: string | null;
  jumlahTerjualKg: number;
  prevJumlahTerjualKg: number;
  totalRevenue: number;
  jumlahTransaksi: number;
  trendPersen: number | null;
  trendArah: 'UP' | 'DOWN' | 'STABLE';
  jumlahSeller: number;
}

interface DemandSignalData {
  gudangId: string;
  period: { month: number; year: number; label: string };
  prevPeriod: { label: string };
  totalTokoAfiliasi: number;
  data: DemandItem[];
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtKg = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}t` : `${n.toFixed(1)}kg`;
const fmtRp = (n: number) => n >= 1_000_000
  ? `Rp ${(n / 1_000_000).toFixed(1)}jt`
  : `Rp ${n.toLocaleString('id-ID')}`;

// const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
//   DRAFT:               { label: 'Draft',           color: 'bg-gray-100 text-gray-600' },
//   TERKIRIM:            { label: 'Terkirim',         color: 'bg-blue-100 text-blue-700' },
//   SEBAGIAN_TERPENUHI:  { label: 'Sebagian',         color: 'bg-amber-100 text-amber-700' },
//   TERPENUHI:           { label: 'Terpenuhi',        color: 'bg-green-100 text-green-700' },
//   DIBATALKAN:          { label: 'Dibatalkan',       color: 'bg-red-100 text-red-600' },
// };

// ─── Form Buat Permintaan ─────────────────────────────────────────────────────
interface FormBuatPermintaanProps {
  item: DemandItem;
  gudangId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const FormBuatPermintaan: React.FC<FormBuatPermintaanProps> = ({ item, gudangId, onSuccess, onClose }) => {
  const token = useAuthStore(s => s.token);
  const [form, setForm] = useState({
    targetKg: Math.round(item.jumlahTerjualKg * 1.2).toString(),
    hargaAcuanPerKg: '',
    deadlinePanen: '',
    catatan: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/permintaan-pengadaan`, {
        gudangId,
        komoditasNama: item.komoditasNama,
        kodeKomoditasGlobal: item.kodeKomoditasGlobal,
        masterProdukId: item.masterProdukId,
        targetKg: form.targetKg,
        hargaAcuanPerKg: form.hargaAcuanPerKg || undefined,
        deadlinePanen: form.deadlinePanen || undefined,
        catatan: form.catatan || undefined,
        jumlahTerjualKgBulanIni: item.jumlahTerjualKg,
        jumlahTerjualKgBulanLalu: item.prevJumlahTerjualKg,
        trendPersen: item.trendPersen,
        trendArah: item.trendArah,
        jumlahSellerMenjual: item.jumlahSeller,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat permintaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-800 mb-1">Buat Permintaan Pengadaan</h3>
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-semibold text-emerald-700">{item.komoditasNama}</span>
          {' '}· Terjual {fmtKg(item.jumlahTerjualKg)} bulan ini
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm mb-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Target Kebutuhan (kg) *</label>
            <input
              type="number" min="1" step="0.1"
              value={form.targetKg}
              onChange={e => setForm({ ...form, targetKg: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Saran: {fmtKg(Math.round(item.jumlahTerjualKg * 1.2))} (120% dari terjual bulan ini)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Harga Acuan per kg (Rp)</label>
            <input
              type="number" min="0" step="100"
              value={form.hargaAcuanPerKg}
              onChange={e => setForm({ ...form, hargaAcuanPerKg: e.target.value })}
              placeholder="Opsional"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Target Deadline Panen</label>
            <input
              type="date"
              value={form.deadlinePanen}
              onChange={e => setForm({ ...form, deadlinePanen: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan untuk Kepala Petani</label>
            <textarea
              rows={2}
              value={form.catatan}
              onChange={e => setForm({ ...form, catatan: e.target.value })}
              placeholder="Info tambahan, spesifikasi kualitas, dll..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50">
              Batal
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? 'Membuat...' : 'Buat (DRAFT)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Form Manual (dari Stok Gudang) ──────────────────────────────────────────
interface FormManualProps {
  gudangId: string;
  token: string | null;
  onSuccess: () => void;
}

const FormManualFromStok: React.FC<FormManualProps> = ({ gudangId, token, onSuccess }) => {
  const [produkList, setProdukList] = useState<any[]>([]);
  const [loadingProduk, setLoadingProduk] = useState(true);
  const [selectedProduk, setSelectedProduk] = useState<string>('');
  const [form, setForm] = useState({
    targetKg: '',
    hargaAcuanPerKg: '',
    deadlinePanen: '',
    catatan: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProduk = async () => {
      try {
        const res = await axios.get(`${API}/produk/staf`, {
          params: { gudangId },
          headers: { Authorization: `Bearer ${token}` },
        });
        setProdukList(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Gagal ambil produk:', err);
      } finally {
        setLoadingProduk(false);
      }
    };
    if (gudangId && token) fetchProduk();
  }, [gudangId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedProduk) {
      setError('Pilih produk terlebih dahulu');
      return;
    }
    const produk = produkList.find(p => p.id === selectedProduk);
    if (!produk) {
      setError('Produk tidak ditemukan');
      return;
    }

    setLoading(true);
    try {
      // 1. Buat permintaan pengadaan (DRAFT)
      const createRes = await axios.post(`${API}/permintaan-pengadaan`, {
        gudangId,
        komoditasNama: produk.nama,
        kodeKomoditasGlobal: produk.kodeKomoditasGlobal || null,
        targetKg: form.targetKg,
        hargaAcuanPerKg: form.hargaAcuanPerKg || undefined,
        deadlinePanen: form.deadlinePanen || undefined,
        catatan: form.catatan || `Manual: Stok saat ini ${produk.stok || produk.stokTersedia || 0} ${produk.satuan || 'kg'}`,
        jumlahTerjualKgBulanIni: 0,
        jumlahTerjualKgBulanLalu: 0,
        trendPersen: null,
        trendArah: 'STABLE',
        jumlahSellerMenjual: 0,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const ppId = createRes.data?.data?.id;
      if (!ppId) throw new Error('Gagal membuat permintaan pengadaan.');

      // 2. Langsung kirim ke PETANI (seperti modal di StokManagementPage)
      await axios.post(`${API}/permintaan-pengadaan/${ppId}/kirim`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(`Permintaan ${produk.nama} ${form.targetKg}kg berhasil dikirim ke kepala petani!`);
      setForm({ targetKg: '', hargaAcuanPerKg: '', deadlinePanen: '', catatan: '' });
      setSelectedProduk('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat/mengirim permintaan');
    } finally {
      setLoading(false);
    }
  };

  const currentProduk = produkList.find(p => p.id === selectedProduk);

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">📦 Ajukan Langsung dari Stok Gudang</p>
        <p className="text-xs text-blue-600">
          Pilih produk dari katalog gudang Anda, tentukan volume kebutuhan, lalu kirim ke kepala petani terafiliasi.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
        {/* Pilih Produk */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pilih Produk Gudang *</label>
          {loadingProduk ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
              <Loader2 size={14} className="animate-spin" /> Memuat produk...
            </div>
          ) : produkList.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Tidak ada produk di gudang ini.</p>
          ) : (
            <select
              value={selectedProduk}
              onChange={e => setSelectedProduk(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            >
              <option value="">-- Pilih produk --</option>
              {produkList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nama} · Stok: {p.stok ?? p.stokTersedia ?? 0} {p.satuan || 'kg'} · Rp {(p.hargaGudang || 0).toLocaleString('id-ID')}/{p.satuan || 'kg'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Info produk yang dipilih */}
        {currentProduk && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <Package size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">{currentProduk.nama}</p>
              <p className="text-[11px] text-emerald-600">
                Stok: {currentProduk.stok ?? currentProduk.stokTersedia ?? 0} {currentProduk.satuan || 'kg'}
                {' · '}Harga: Rp {(currentProduk.hargaGudang || 0).toLocaleString('id-ID')}/{currentProduk.satuan || 'kg'}
              </p>
            </div>
          </div>
        )}

        {/* Target Kg */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Jumlah Kebutuhan (kg) *</label>
          <input
            type="number" min="1" step="0.1"
            value={form.targetKg}
            onChange={e => setForm({ ...form, targetKg: e.target.value })}
            placeholder="Contoh: 500"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            required
          />
        </div>

        {/* 2 column: harga + deadline */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Harga Acuan (Rp/kg)</label>
            <input
              type="number" min="0" step="100"
              value={form.hargaAcuanPerKg}
              onChange={e => setForm({ ...form, hargaAcuanPerKg: e.target.value })}
              placeholder="Opsional"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Deadline</label>
            <input
              type="date"
              value={form.deadlinePanen}
              onChange={e => setForm({ ...form, deadlinePanen: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        {/* Catatan */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catatan</label>
          <textarea
            rows={2}
            value={form.catatan}
            onChange={e => setForm({ ...form, catatan: e.target.value })}
            placeholder="Info tambahan untuk kepala petani..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !selectedProduk}
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {loading ? 'Mengirim ke petani...' : 'Buat & Kirim ke Kepala Petani'}
        </button>
      </form>
    </div>
  );
};

// ─── Tab: Dari Pesanan Seller ─────────────────────────────────────────────────
interface TabDariPesananProps {
  gudangId: string;
  token: string | null;
  onRequestCreated: () => void;
}

const TabDariPesanan: React.FC<TabDariPesananProps> = ({ gudangId, token, onRequestCreated }) => {
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPengajuan = async () => {
      try {
        const res = await axios.get(`${API}/pengajuan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Filter to show only active ones that need fulfillment
        const list = (res.data?.data || []).filter(
          (p: any) => p.status === 'DIAJUKAN' || p.status === 'DIPROSES'
        );
        setPengajuanList(list);
      } catch (err) {
        console.error('Gagal ambil pengajuan:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPengajuan();
  }, [token]);

  // Flatten all items from all pengajuan into a list with context
  const flatItems = pengajuanList.flatMap((req) =>
    (req.items || []).map((item: any) => ({
      ...item,
      pengajuanId: req.id,
      sellerNama: req.toko?.nama || req.tokoNama || 'Seller',
      gudangId: req.gudangId || gudangId,
      pengajuanStatus: req.status,
      pengajuanCreatedAt: req.createdAt,
    }))
  );

  const handleBuatPermintaan = async (item: any) => {
    const itemKey = `${item.pengajuanId}-${item.id}`;
    setActionLoading(itemKey);
    setError('');
    setSuccess('');
    try {
      const komoditasNama = item.produkGudang?.nama || item.produk?.nama || item.produkNama || 'Komoditas';
      const targetKg = item.jumlahPermintaan || item.jumlahKg || 0;

      const createRes = await axios.post(`${API}/permintaan-pengadaan`, {
        gudangId,
        komoditasNama,
        kodeKomoditasGlobal: item.produkGudang?.masterKomoditas?.kodeKomoditasGlobal || item.produkGudang?.kodeKomoditasGlobal || null,
        targetKg,
        hargaAcuanPerKg: item.produkGudang?.hargaGudang || undefined,
        catatan: `Memenuhi pesanan seller: ${item.sellerNama} — ${komoditasNama} ${targetKg} kg (Pengajuan #${item.pengajuanId?.substring(0, 8)})`,
        jumlahTerjualKgBulanIni: 0,
        jumlahTerjualKgBulanLalu: 0,
        trendPersen: null,
        trendArah: 'STABLE',
        jumlahSellerMenjual: 1,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const ppId = createRes.data?.data?.id;
      if (!ppId) throw new Error('Gagal membuat permintaan.');

      // Langsung kirim ke petani
      await axios.post(`${API}/permintaan-pengadaan/${ppId}/kirim`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(`Permintaan ${komoditasNama} ${targetKg} kg berhasil dikirim ke kepala petani!`);
      onRequestCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Gagal membuat permintaan');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">🛒 Kebutuhan dari Pesanan Seller</p>
        <p className="text-xs text-amber-600">
          Daftar kebutuhan dari pengajuan stok seller yang perlu dipenuhi. Klik "Minta ke Petani" untuk otomatis membuat permintaan pengadaan sesuai jumlah kebutuhan.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {flatItems.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <Package size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm">Tidak ada kebutuhan dari pesanan seller saat ini.</p>
          <p className="text-xs text-gray-400 mt-1">Seller mengajukan stok dari menu Pengajuan Aktif.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {flatItems.length} Item Kebutuhan dari {pengajuanList.length} Pengajuan
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {flatItems.map((item) => {
              const produkNama = item.produkGudang?.nama || item.produk?.nama || item.produkNama || 'Produk';
              const jumlahKg = item.jumlahPermintaan || item.jumlahKg || 0;
              const itemKey = `${item.pengajuanId}-${item.id}`;

              return (
                <div key={itemKey} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  {/* Icon */}
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-amber-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{produkNama}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users size={11} /> {item.sellerNama}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.pengajuanStatus === 'DIAJUKAN' ? 'bg-yellow-100 text-yellow-700' :
                        item.pengajuanStatus === 'DIPROSES' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.pengajuanStatus === 'DIAJUKAN' ? 'Diajukan' : item.pengajuanStatus === 'DIPROSES' ? 'Diproses' : item.pengajuanStatus}
                      </span>
                    </div>
                    {item.pengajuanCreatedAt && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Diajukan: {new Date(item.pengajuanCreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* Jumlah kebutuhan — highlighted */}
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-lg font-bold text-emerald-700">{jumlahKg.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-gray-400 font-medium">kg dibutuhkan</p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleBuatPermintaan(item)}
                    disabled={actionLoading === itemKey}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-all"
                  >
                    {actionLoading === itemKey ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    Minta ke Petani
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PermintaanPengadaanPage: React.FC = () => {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);

  const [myGudangId, setMyGudangId] = useState<string | null>(null);
  const [demandData, setDemandData] = useState<DemandSignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sinyal' | 'manual' | 'pesanan'>('pesanan');
  const [formItem, setFormItem] = useState<DemandItem | null>(null);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  // Ambil gudang user
  useEffect(() => {
    if (user?.managedWarehouses && user.managedWarehouses.length > 0) {
      setMyGudangId(user.managedWarehouses[0].id);
    }
  }, [user]);

  const fetchDemandSignal = async () => {
    if (!myGudangId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/permintaan-pengadaan/demand-signal`, {
        params: { gudangId: myGudangId },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDemandData(res.data);
    } catch (err) {
      console.error('Gagal ambil demand signal:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermintaanList = async () => {
    // Dipindahkan ke DaftarPermintaanPage
  };

  useEffect(() => {
    if (myGudangId) {
      fetchDemandSignal();
      fetchPermintaanList();
    }
  }, [myGudangId]);

  // handleKirim removed

  const handleFormSuccess = () => {
    setFormItem(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wheat size={24} className="text-emerald-600" />
            Permintaan Pengadaan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau tren pasar dari seller afiliasi → buat permintaan pengadaan → kirim ke kepala petani
          </p>
        </div>
        <button
          onClick={() => { fetchDemandSignal(); fetchPermintaanList(); }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['pesanan', 'manual', 'sinyal'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'pesanan' ? (
              <span className="flex items-center gap-1.5"><Users size={14} /> Dari Pesanan Seller</span>
            ) : tab === 'manual' ? (
              <span className="flex items-center gap-1.5"><Package size={14} /> Ajukan Manual</span>
            ) : (
              <span className="flex items-center gap-1.5"><TrendingUp size={14} /> Sinyal Pasar</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: Sinyal Pasar ── */}
      {activeTab === 'sinyal' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
            </div>
          ) : !demandData ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <AlertTriangle size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">Tidak dapat mengambil data dari ECOMMERCE service.</p>
              <p className="text-xs text-gray-400 mt-1">Pastikan ECOMMERCE backend berjalan di port 4000.</p>
            </div>
          ) : demandData && demandData.period ? (
            <>
              {/* Info summary */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">
                    {demandData.period?.label} · {demandData.totalTokoAfiliasi} seller afiliasi
                  </p>
                  <p className="text-xs text-emerald-600">
                    {demandData.data.length} komoditas terdeteksi · vs {demandData.prevPeriod?.label}
                  </p>
                </div>
              </div>

              {demandData.data.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
                  <Package size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-500 text-sm">Belum ada data penjualan dari seller afiliasi bulan ini.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-gray-800 text-sm">Top Komoditas dari Seller Afiliasi</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Klik baris untuk detail · Klik "Buat Permintaan" untuk aksi</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {demandData.data.map((item, idx) => {
                      const isUp = item.trendArah === 'UP';
                      const isDown = item.trendArah === 'DOWN';
                      const isExpanded = expandedSignal === item.komoditasNama;

                      return (
                        <div key={item.komoditasNama}>
                          <button
                            onClick={() => setExpandedSignal(isExpanded ? null : item.komoditasNama)}
                            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            {/* Rank */}
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              idx === 0 ? 'bg-amber-100 text-amber-700' :
                              idx === 1 ? 'bg-gray-100 text-gray-600' :
                              idx === 2 ? 'bg-orange-50 text-orange-600' :
                              'bg-gray-50 text-gray-400'
                            }`}>
                              {idx + 1}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-800">{item.komoditasNama}</p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <span className="text-xs text-gray-500">{fmtKg(item.jumlahTerjualKg)} terjual</span>
                                <span className="text-xs text-gray-300">·</span>
                                <span className="text-xs text-gray-500">{item.jumlahSeller} seller</span>
                                <span className="text-xs text-gray-300">·</span>
                                <span className="text-xs text-gray-500">{item.jumlahTransaksi} transaksi</span>
                              </div>
                            </div>

                            {/* Tren */}
                            <div className="text-right flex-shrink-0">
                              <div className={`flex items-center gap-1 justify-end text-sm font-bold ${
                                isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-gray-400'
                              }`}>
                                {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : <Minus size={14} />}
                                {item.trendPersen !== null ? `${item.trendPersen > 0 ? '+' : ''}${item.trendPersen}%` : '-'}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{fmtRp(item.totalRevenue)}</p>
                            </div>

                            {/* Expand indicator */}
                            <div className="text-gray-300 flex-shrink-0">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="bg-emerald-50/50 border-t border-emerald-100 px-6 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {[
                                  { label: 'Terjual Bulan Ini', value: fmtKg(item.jumlahTerjualKg) },
                                  { label: 'Terjual Bulan Lalu', value: fmtKg(item.prevJumlahTerjualKg) },
                                  { label: 'Total Revenue', value: fmtRp(item.totalRevenue) },
                                  { label: 'Jumlah Seller', value: `${item.jumlahSeller} toko` },
                                ].map(s => (
                                  <div key={s.label} className="bg-white rounded-xl p-3">
                                    <p className="text-[10px] text-gray-400">{s.label}</p>
                                    <p className="font-bold text-sm text-gray-800 mt-0.5">{s.value}</p>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => setFormItem(item)}
                                className="flex items-center gap-2 bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200"
                              >
                                <Plus size={15} /> Buat Permintaan Pengadaan
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <AlertTriangle size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">Data permintaan pasar tidak lengkap.</p>
              <p className="text-xs text-gray-400 mt-1">Silakan coba refresh halaman atau hubungi administrator.</p>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Manual (dari Stok Gudang) ── */}
      {activeTab === 'manual' && myGudangId && (
        <FormManualFromStok
          gudangId={myGudangId}
          token={token}
          onSuccess={() => { fetchPermintaanList(); }}
        />
      )}
      {activeTab === 'manual' && !myGudangId && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <AlertTriangle size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm">Gudang belum terdeteksi. Pastikan Anda login sebagai admin gudang.</p>
        </div>
      )}

      {/* ─── TAB: Dari Pesanan Seller ── */}
      {activeTab === 'pesanan' && myGudangId && (
        <TabDariPesanan gudangId={myGudangId} token={token} onRequestCreated={() => fetchPermintaanList()} />
      )}
      {activeTab === 'pesanan' && !myGudangId && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <AlertTriangle size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm">Gudang belum terdeteksi.</p>
        </div>
      )}



      {/* Form Modal */}
      {formItem && myGudangId && (
        <FormBuatPermintaan
          item={formItem}
          gudangId={myGudangId}
          onSuccess={handleFormSuccess}
          onClose={() => setFormItem(null)}
        />
      )}
    </div>
  );
};

export default PermintaanPengadaanPage;
