import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  Settings2,
  Loader2,
  Check,
  Leaf,
  Calculator,
  Save,
  Archive,
  TrendingUp,
  AlertTriangle,
  History,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProdukGudang {
  id: string;
  nama: string;
  varianProduk?: string | null;
  satuan: string;
  hargaGudang: number;
  stok: number;
  isActive: boolean;
  gudangId: string;
  masterKomoditas?: { nama: string; kategori?: string };
}

interface HppData {
  hargaBeliPetani: number;
  biayaSortir: number;
  biayaGrading: number;
  biayaPengemasan: number;
  biayaOverhead: number;
  biayaLainnya: number;
  marginRp: number;
  catatan: string;
}

const defaultHpp: HppData = {
  hargaBeliPetani: 0,
  biayaSortir: 0,
  biayaGrading: 0,
  biayaPengemasan: 0,
  biayaOverhead: 0,
  biayaLainnya: 0,
  marginRp: 0,
  catatan: '',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getNamaLengkap(p: ProdukGudang) {
  return p.varianProduk ? `${p.nama} ${p.varianProduk}` : p.nama;
}

// ─── HPP Form Panel ───────────────────────────────────────────────────────────

interface HppFormProps {
  produk: ProdukGudang;
  readOnly?: boolean;
}

const HppFormPanel: React.FC<HppFormProps> = ({ produk, readOnly = false }) => {
  const [hpp, setHpp] = useState<HppData>({ ...defaultHpp });
  const [loadingHpp, setLoadingHpp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [hargaPetaniStatus, setHargaPetaniStatus] = useState<'loading' | 'found' | 'not_found' | 'error'>('loading');

  const totalHpp = hpp.hargaBeliPetani + hpp.biayaSortir + hpp.biayaGrading + hpp.biayaPengemasan + hpp.biayaOverhead + hpp.biayaLainnya;
  const hargaJual = totalHpp + hpp.marginRp;
  const marginPersen = hargaJual > 0 ? (hpp.marginRp / hargaJual) * 100 : 0;

  useEffect(() => {
    const fetchHpp = async () => {
      setLoadingHpp(true);
      setSuccess('');
      setError('');
      setHargaPetaniStatus('loading');
      try {
        const res = await api.get(`/hpp/${produk.id}`);
        let fetchedHpp = { ...defaultHpp };
        
        if (res.data.data?.hpp) {
          const h = res.data.data.hpp;
          fetchedHpp = {
            hargaBeliPetani: h.hargaBeliPetani || 0,
            biayaSortir: h.biayaSortir || 0,
            biayaGrading: h.biayaGrading || 0,
            biayaPengemasan: h.biayaPengemasan || 0,
            biayaOverhead: h.biayaOverhead || 0,
            biayaLainnya: h.biayaLainnya || 0,
            marginRp: h.marginRp || 0,
            catatan: h.catatan || '',
          };
        }

        // Auto-sync harga dari Petani
        try {
          const resPetani = await api.get('/harga-petani');
          const komoditasList = resPetani.data.komoditas || [];
          const match = komoditasList.find((k: any) => 
            k.nama === produk.masterKomoditas?.nama ||
            k.nama === produk.nama
          );
          if (match) {
            fetchedHpp.hargaBeliPetani = match.hargaSaatIni;
            setHargaPetaniStatus('found');
          } else {
            setHargaPetaniStatus('not_found');
          }
        } catch (err) {
          console.error("Gagal auto-sync harga petani", err);
          setHargaPetaniStatus('error');
        }

        setHpp(fetchedHpp);
      } catch (e) {
        console.error('Error fetching local HPP:', e);
        setHpp({ ...defaultHpp });
        setHargaPetaniStatus('error');
      } finally {
        setLoadingHpp(false);
      }
    };
    fetchHpp();
  }, [produk.id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/hpp', {
        produkGudangId: produk.id,
        gudangId: produk.gudangId,
        ...hpp,
      });
      setSuccess('HPP berhasil disimpan!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan HPP');
    } finally {
      setSaving(false);
    }
  };



  if (loadingHpp) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Produk Info */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {getNamaLengkap(produk)}
            {!produk.isActive && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Nonaktif
              </span>
            )}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Harga Jual: <strong>Rp {hargaJual.toLocaleString('id-ID')}</strong>/{produk.satuan}
            {produk.masterKomoditas?.kategori && (
              <span className="ml-2 capitalize">· {produk.masterKomoditas.kategori}</span>
            )}
          </p>
        </div>
        <Calculator size={18} className="text-emerald-500 flex-shrink-0" />
      </div>

      {readOnly && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs text-slate-500">
          <Archive size={13} />
          Produk ini sudah tidak aktif. Data HPP ditampilkan sebagai riwayat (read-only).
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 font-medium flex items-center gap-1.5">
          <Check size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Status Harga Petani */}
      {hargaPetaniStatus === 'found' && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-1.5 mt-3">
          <Check size={14} className="text-emerald-500" />
          Harga beli dari Petani berhasil disinkronkan: <strong>Rp {hpp.hargaBeliPetani.toLocaleString('id-ID')}/kg</strong>
        </div>
      )}
      {hargaPetaniStatus === 'not_found' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium flex items-center gap-1.5 mt-3">
          <AlertTriangle size={14} className="text-amber-500" />
          Harga Petani untuk komoditas <strong>"{produk.masterKomoditas?.nama || produk.nama}"</strong> belum tersedia. Harga beli diisi Rp 0 — hubungi admin Petani untuk mengatur harga komoditas ini.
        </div>
      )}
      {hargaPetaniStatus === 'error' && (
        <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium flex items-center gap-1.5 mt-3">
          <AlertTriangle size={14} className="text-red-500" />
          Gagal mengambil harga dari server Petani. Pastikan server Petani aktif.
        </div>
      )}

      {/* Cost inputs */}
      <div className="flex items-center justify-between mt-4">
        <label className="text-[12px] font-bold text-slate-700">Komponen Biaya</label>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {[
          { key: 'hargaBeliPetani', label: 'Harga Beli Petani', hint: hargaPetaniStatus === 'found' ? '✓ Otomatis dari Petani' : '⚠ Belum tersedia dari Petani' },
          { key: 'biayaSortir', label: 'Biaya Sortir & Cuci', hint: 'Per kg' },
          { key: 'biayaGrading', label: 'Biaya Grading/QC', hint: 'Per kg' },
          { key: 'biayaPengemasan', label: 'Biaya Pengemasan', hint: 'Per kg' },
          { key: 'biayaOverhead', label: 'Biaya Overhead', hint: 'Listrik, tenaga, dll per kg' },
          { key: 'biayaLainnya', label: 'Biaya Lainnya', hint: 'Transportasi, dll per kg' },
        ].map(({ key, label, hint }) => (
          <div key={key}>
            <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
              <input
                type="number"
                min="0"
                disabled={readOnly || key === 'hargaBeliPetani'}
                value={(hpp as any)[key] || ''}
                onChange={(e) => setHpp(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                placeholder="0"
              />
            </div>
            <p className="text-[9px] text-slate-300 mt-0.5">{hint}</p>
          </div>
        ))}
        {/* Margin Input */}
        <div>
          <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1 text-emerald-600">Margin Profit</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
            <input
              type="number"
              min="0"
              disabled={readOnly}
              value={hpp.marginRp || ''}
              onChange={(e) => setHpp(prev => ({ ...prev, marginRp: parseFloat(e.target.value) || 0 }))}
              className="w-full pl-8 pr-3 py-2 border border-emerald-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed bg-emerald-50"
              placeholder="0"
            />
          </div>
          <p className="text-[9px] text-slate-300 mt-0.5">Keuntungan per kg</p>
        </div>
      </div>

      {/* Catatan */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Catatan</label>
        <textarea
          value={hpp.catatan}
          disabled={readOnly}
          onChange={(e) => setHpp(prev => ({ ...prev, catatan: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
          rows={2}
          placeholder={readOnly ? '' : 'Catatan opsional...'}
        />
      </div>

      {/* Summary */}
      <div className={`border rounded-xl p-4 space-y-2 ${
        hpp.marginRp >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
      }`}>
        <p className="text-[9px] text-slate-500 font-semibold uppercase flex items-center gap-1">
          <TrendingUp size={10} /> Ringkasan HPP
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[9px] text-slate-400">Total HPP</p>
            <p className="text-sm font-bold text-red-600">Rp {totalHpp.toLocaleString('id-ID')}</p>
            <p className="text-[9px] text-slate-300">per {produk.satuan}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">Harga Jual</p>
            <p className="text-sm font-bold text-slate-700">Rp {hargaJual.toLocaleString('id-ID')}</p>
            <p className="text-[9px] text-slate-300">per {produk.satuan}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">Margin</p>
            <p className={`text-sm font-bold ${hpp.marginRp >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              Rp {hpp.marginRp.toLocaleString('id-ID')}
            </p>
            <p className={`text-[9px] font-semibold ${hpp.marginRp >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ({marginPersen.toFixed(1)}%)
            </p>
          </div>
        </div>
        {hpp.marginRp < 0 && !readOnly && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-red-100">
            <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />
            <p className="text-[10px] text-red-500 font-medium">
              Margin minus — periksa kembali harga komponen.
            </p>
          </div>
        )}
      </div>

      {/* Save button — hanya tampil kalau produk aktif */}
      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Menyimpan...' : 'Simpan HPP'}
        </button>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const HppPengaturanPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const gudangId = user?.managedWarehouses?.[0]?.id || '';

  const [tab, setTab] = useState<'aktif' | 'riwayat'>('aktif');
  const [loading, setLoading] = useState(true);
  const [produkAktif, setProdukAktif] = useState<ProdukGudang[]>([]);
  const [produkNonaktif, setProdukNonaktif] = useState<ProdukGudang[]>([]);
  const [selected, setSelected] = useState<ProdukGudang | null>(null);

  const fetchProduk = useCallback(async () => {
    if (!gudangId) return;
    try {
      setLoading(true);
      const res = await api.get('/produk/admin', { params: { gudangId } });
      const all: ProdukGudang[] = res.data.data || [];
      setProdukAktif(all.filter((p) => p.isActive));
      setProdukNonaktif(all.filter((p) => !p.isActive));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [gudangId]);

  useEffect(() => {
    fetchProduk();
  }, [fetchProduk]);

  // Reset selected when switching tabs
  const handleTabChange = (t: 'aktif' | 'riwayat') => {
    setTab(t);
    setSelected(null);
  };

  const currentList = tab === 'aktif' ? produkAktif : produkNonaktif;

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
        <h1 className="text-xl font-bold text-slate-800">Pengaturan HPP</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atur komponen biaya per produk untuk menghitung Harga Pokok Penjualan dan margin
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange('aktif')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
            tab === 'aktif'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Leaf size={13} />
          Produk Dijual ({produkAktif.length})
        </button>
        <button
          onClick={() => handleTabChange('riwayat')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
            tab === 'riwayat'
              ? 'bg-white text-slate-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History size={13} />
          Riwayat HPP ({produkNonaktif.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Product List */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-1.5">
            {tab === 'aktif' ? (
              <><Leaf size={12} className="text-emerald-500" /> Produk Aktif</>
            ) : (
              <><Archive size={12} className="text-slate-400" /> Tidak Dijual</>
            )}
          </h3>

          {currentList.length === 0 ? (
            <div className="text-center py-8">
              {tab === 'aktif' ? (
                <>
                  <Leaf size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Belum ada produk aktif</p>
                  <p className="text-[10px] text-slate-300 mt-1">Tambahkan produk di halaman "Produk yang Dijual"</p>
                </>
              ) : (
                <>
                  <Archive size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Belum ada riwayat</p>
                  <p className="text-[10px] text-slate-300 mt-1">Produk yang dinonaktifkan akan muncul di sini</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {currentList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selected?.id === p.id
                      ? tab === 'aktif'
                        ? 'bg-emerald-50 border-emerald-200 border'
                        : 'bg-slate-100 border-slate-300 border'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab === 'aktif' ? (
                      <Leaf size={12} className={selected?.id === p.id ? 'text-emerald-600' : 'text-slate-300'} />
                    ) : (
                      <Archive size={12} className="text-slate-300" />
                    )}
                    <span className="text-sm font-medium text-slate-700 truncate">{getNamaLengkap(p)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 ml-4">
                    Harga Jual: Rp {p.hargaGudang.toLocaleString('id-ID')}/{p.satuan}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* HPP Panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
              <Settings2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium">
                {tab === 'aktif'
                  ? 'Pilih produk untuk mengatur HPP'
                  : 'Pilih produk untuk melihat riwayat HPP'}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {tab === 'aktif'
                  ? 'Isi komponen biaya untuk menghitung margin profit'
                  : 'Data HPP produk yang sudah tidak dijual'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <HppFormPanel
                key={selected.id}
                produk={selected}
                readOnly={tab === 'riwayat'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HppPengaturanPage;
