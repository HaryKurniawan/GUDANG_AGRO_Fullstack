import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { getRolePrefix } from '../../lib/rolePathHelper';
import {
  ArrowLeft,
  Calendar,
  Store,
  Warehouse,
  Loader2,
  Package,
  CheckCircle,
  Truck,
  Archive,
  XCircle,
  AlertCircle,
  Sprout,
  Plus,
  Send,
  Percent,
} from 'lucide-react';

interface KemasanLine {
  ukuranKg: number;
  jumlahKemasan: number;
}

interface ItemUpdate {
  itemId: string;
  jumlahDisetujui: number;
  hargaPerUnit: number;
  produkGudangId?: string;
  kemasanDetail: KemasanLine[];
}

interface CekKemasanLine {
  ukuranKg: number;
  diminta: number; // pack yang diminta
  tersediaKemasan: number; // pack siap (stokKemasan) di ukuran tsb
  terpenuhiKemasan: number; // pack yang bisa dipenuhi dari stok terkemas
  defisitPack: number; // pack yang harus dikemas dari bulk
  defisitKg: number; // kg yang dibutuhkan dari bulk untuk menutup defisit
}

interface CekStokKemasan {
  hasRincian: boolean;
  lines: CekKemasanLine[];
  bulkKg: number; // stok curah tersedia
  butuhDariBulkKg: number; // total kg yang perlu diambil dari bulk
  kekuranganKg: number; // kg yang masih kurang setelah bulk dipakai
  cukup: boolean;
}

// Cek kecukupan stok per kemasan: pesanan ambil stok yang sudah dikemas sesuai
// ukuran, defisit ditutup dari stok curah (bulk). Bila bulk pun tak cukup → kurang.
const cekStokKemasan = (produkGudang: any, kemasan: KemasanLine[]): CekStokKemasan => {
  const bulkKg = Number(produkGudang?.stokBulk) || 0;
  const kemasanGudang: any[] = produkGudang?.kemasan || [];

  // Tanpa rincian kemasan: tidak bisa cek per-kemasan
  if (!kemasan || kemasan.length === 0) {
    return { hasRincian: false, lines: [], bulkKg, butuhDariBulkKg: 0, kekuranganKg: 0, cukup: true };
  }

  const lines: CekKemasanLine[] = kemasan.map((pkg) => {
    const diminta = Number(pkg.jumlahKemasan) || 0;
    const stok = kemasanGudang.find((k) => Number(k.ukuranKg) === Number(pkg.ukuranKg));
    const tersediaKemasan = Number(stok?.stokKemasan) || 0;
    const terpenuhiKemasan = Math.min(diminta, tersediaKemasan);
    const defisitPack = Math.max(0, diminta - tersediaKemasan);
    const defisitKg = Math.round(defisitPack * (Number(pkg.ukuranKg) || 0) * 10) / 10;
    return { ukuranKg: Number(pkg.ukuranKg), diminta, tersediaKemasan, terpenuhiKemasan, defisitPack, defisitKg };
  });

  const butuhDariBulkKg = Math.round(lines.reduce((s, l) => s + l.defisitKg, 0) * 10) / 10;
  const kekuranganKg = Math.round(Math.max(0, butuhDariBulkKg - bulkKg) * 10) / 10;

  return {
    hasRincian: true,
    lines,
    bulkKg,
    butuhDariBulkKg,
    kekuranganKg,
    cukup: kekuranganKg <= 0,
  };
};

const PengajuanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = getRolePrefix(location.pathname);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [catatan, setCatatan] = useState('');
  const [itemUpdates, setItemUpdates] = useState<ItemUpdate[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Modal teruskan ke kepala petani (pengadaan) ──────────────────────────────
  const [pengadaanModal, setPengadaanModal] = useState<{
    item: any;
    kekuranganKg: number;
    persenPenyusutan: number;
  } | null>(null);
  const [pengadaanForm, setPengadaanForm] = useState({ tambahKg: '0', hargaAcuanPerKg: '', deadlinePanen: '', catatan: '' });
  const [pengadaanLoading, setPengadaanLoading] = useState(false);

  // ── Ambil rincian kemasan dari item (dikirim seller) ──────────────────────────
  const deriveKemasan = (item: any): KemasanLine[] => {
    if (item.kemasanDetail && item.kemasanDetail.length > 0) {
      return item.kemasanDetail.map((k: any) => ({ ukuranKg: k.ukuranKg, jumlahKemasan: k.jumlahKemasan }));
    }
    if (item.ukuranKemasanKg && item.jumlahKemasan) {
      return [{ ukuranKg: item.ukuranKemasanKg, jumlahKemasan: item.jumlahKemasan }];
    }
    return [];
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pengajuan/${id}`);
      const data = response.data.data;
      setRequest(data);
      setCatatan(data.catatan || '');

      setItemUpdates(
        data.items.map((item: any) => ({
          itemId: item.id,
          jumlahDisetujui: item.jumlahDisetujui ?? item.jumlahPermintaan,
          hargaPerUnit: item.hargaPerUnit ?? item.produkGudang?.hargaGudang ?? 0,
          produkGudangId: item.produkId || '',
          kemasanDetail: deriveKemasan(item),
        })),
      );
    } catch (error) {
      console.error('Error fetching stock request details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handlePriceChange = (itemId: string, val: number) => {
    setItemUpdates((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, hargaPerUnit: Math.max(0, val) } : it)),
    );
  };

  const handleStatusUpdate = async (newStatus: 'DIPROSES' | 'DIKIRIM' | 'SELESAI' | 'DITOLAK') => {
    try {
      setSubmitting(true);
      setMessage(null);

      const payload: any = { status: newStatus, catatan };

      // Saat menyetujui (DIAJUKAN → DIPROSES) kirim harga & rincian kemasan (dari seller)
      if (request.status === 'DIAJUKAN' && newStatus === 'DIPROSES') {
        const tanpaHarga = itemUpdates.find((it) => it.hargaPerUnit <= 0);
        if (tanpaHarga) {
          setMessage({ type: 'error', text: 'Harga beli per unit setiap produk harus diisi sebelum diproses.' });
          setSubmitting(false);
          return;
        }
        payload.itemUpdates = itemUpdates;
      }

      const response = await api.patch(`/pengajuan/${id}/status`, payload);
      setMessage({ type: 'success', text: `Status berhasil diperbarui menjadi ${newStatus}.` });
      setRequest(response.data.data);
      fetchDetail();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Gagal memperbarui status pengajuan.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Buka modal teruskan ke petani untuk item yang stoknya kurang ─────────────
  const openPengadaanModal = (item: any, kekuranganKg: number) => {
    const defaultPenyusutan = item.produkGudang?.masterKomoditas?.persenPenyusutan || 0;
    setPengadaanForm({
      tambahKg: '0',
      hargaAcuanPerKg: item.produkGudang?.hargaGudang ? String(item.produkGudang.hargaGudang) : '',
      deadlinePanen: '',
      catatan: `Pengadaan untuk memenuhi pesanan ${request.toko?.nama || 'seller'} (#${request.id.substring(0, 8)})`,
    });
    setPengadaanModal({ item, kekuranganKg, persenPenyusutan: defaultPenyusutan });
  };

  // ── Submit: buat PermintaanPengadaan lalu langsung kirim ke PETANI ───────────
  const handleSubmitPengadaan = async () => {
    if (!pengadaanModal) return;
    const { item, kekuranganKg, persenPenyusutan } = pengadaanModal;
    const penyusutanKg = kekuranganKg * (persenPenyusutan / 100);
    const kebutuhanBersihDanPenyusutan = kekuranganKg + penyusutanKg;
    const tambah = parseFloat(pengadaanForm.tambahKg) || 0;
    const targetKg = Math.round((kebutuhanBersihDanPenyusutan + tambah) * 10) / 10;

    if (targetKg <= 0) {
      setMessage({ type: 'error', text: 'Target pengadaan harus lebih dari 0 kg.' });
      return;
    }

    try {
      setPengadaanLoading(true);
      // 1. Buat permintaan pengadaan (DRAFT)
      const createRes = await api.post('/permintaan-pengadaan', {
        gudangId: request.gudangId,
        komoditasNama: item.produk?.nama || item.produkNama || 'Komoditas',
        kodeKomoditasGlobal: item.produkGudang?.kodeKomoditasGlobal || undefined,
        targetKg,
        hargaAcuanPerKg: pengadaanForm.hargaAcuanPerKg || undefined,
        deadlinePanen: pengadaanForm.deadlinePanen || undefined,
        catatan: pengadaanForm.catatan || undefined,
      });

      const ppId = createRes.data?.data?.id;
      if (!ppId) throw new Error('Gagal membuat permintaan pengadaan.');

      // 2. Langsung kirim ke PETANI
      await api.post(`/permintaan-pengadaan/${ppId}/kirim`, {});

      setMessage({
        type: 'success',
        text: `Permintaan pengadaan ${targetKg} kg ${item.produk?.nama || ''} berhasil diteruskan ke kepala petani.`,
      });
      setPengadaanModal(null);
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Gagal meneruskan ke petani.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setPengadaanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Pengajuan stok tidak ditemukan.</p>
        <button onClick={() => navigate(`${prefix}/pengajuan`)} className="mt-4 text-xs font-semibold text-emerald-600">
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const isEditable = request.status === 'DIAJUKAN';
  const formattedDate = new Date(request.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const statusSteps = [
    { key: 'DIAJUKAN', label: 'Diajukan', icon: <Package className="w-4 h-4" /> },
    { key: 'DIPROSES', label: 'Diproses', icon: <Archive className="w-4 h-4" /> },
    { key: 'DIKIRIM', label: 'Dikirim', icon: <Truck className="w-4 h-4" /> },
    { key: 'SELESAI', label: 'Selesai', icon: <CheckCircle className="w-4 h-4" /> },
  ];
  const currentStepIndex = statusSteps.findIndex((s) => s.key === request.status);

  // Grand total
  const grandTotal = request.items.reduce((sum: number, item: any) => {
    const u = itemUpdates.find((x) => x.itemId === item.id);
    const qty = u?.jumlahDisetujui ?? item.jumlahPermintaan;
    const price = u?.hargaPerUnit ?? item.hargaPerUnit ?? 0;
    return sum + qty * price;
  }, 0);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DIAJUKAN: 'bg-amber-50 text-amber-700 border-amber-200',
      DIPROSES: 'bg-blue-50 text-blue-700 border-blue-200',
      DIKIRIM: 'bg-blue-50 text-blue-700 border-blue-200',
      SELESAI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      DITOLAK: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`${prefix}/pengajuan`)}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Detail Pengadaan</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge(request.status)}`}>
              {request.status}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mt-0.5">Pengajuan #{request.id.substring(0, 8)}</h2>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed border flex items-start gap-2.5 ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          {message.text}
        </div>
      )}

      {/* Timeline */}
      {request.status !== 'DITOLAK' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                      isPast ? 'bg-emerald-100 border-emerald-400 text-emerald-600'
                      : isCurrent ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-300'
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      isCurrent ? 'text-emerald-600' : isPast ? 'text-slate-600' : 'text-slate-300'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-3 bg-slate-100 rounded">
                      <div className={`h-full transition-all duration-500 bg-emerald-500 ${idx < currentStepIndex ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daftar Barang */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Package className="w-4 h-4 text-emerald-600" />
            Daftar Barang ({request.items.length})
          </h3>

          <div className="space-y-3">
            {request.items.map((item: any) => {
              const u = itemUpdates.find((x) => x.itemId === item.id);
              const qty = u?.jumlahDisetujui ?? item.jumlahPermintaan;
              const price = u?.hargaPerUnit ?? item.hargaPerUnit ?? 0;
              const kemasan = u?.kemasanDetail ?? deriveKemasan(item);

              return (
                <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Info produk */}
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      {item.produk?.gambarUrl ? (
                        <img src={item.produk.gambarUrl} alt={item.produk.nama} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{item.produk?.nama}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Diminta: <span className="font-semibold text-slate-600">{item.jumlahPermintaan} kg</span>
                        {item.grade && <span className="ml-2">· Grade {item.grade}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Rincian kemasan dari seller */}
                  <div className="px-3.5 pb-3 flex flex-wrap gap-2">
                    {kemasan.length > 0 ? (
                      kemasan.map((pkg, i) => (
                        <span key={i} className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] text-emerald-700 font-medium">
                          {pkg.jumlahKemasan} pack × {pkg.ukuranKg} kg
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Tanpa rincian kemasan</span>
                    )}
                  </div>

                  {/* Indikator stok gudang per-kemasan & teruskan ke petani jika kurang */}
                  {(() => {
                    const cek = cekStokKemasan(item.produkGudang, kemasan);
                    const cukup = cek.cukup;
                    return (
                      <div className={`px-3.5 py-2.5 border-t space-y-2 ${
                        cukup ? 'bg-emerald-50/40 border-emerald-100/60' : 'bg-amber-50/50 border-amber-100'
                      }`}>
                        {/* Rincian per kemasan */}
                        {cek.hasRincian && (
                          <div className="flex flex-wrap gap-1.5">
                            {cek.lines.map((l, i) => {
                              const okPack = l.defisitPack <= 0;
                              return (
                                <span
                                  key={i}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                    okPack
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}
                                  title={
                                    okPack
                                      ? 'Stok kemasan cukup'
                                      : `Kurang ${l.defisitPack} pack, akan dikemas dari curah (${l.defisitKg} kg)`
                                  }
                                >
                                  {l.ukuranKg} kg: butuh {l.diminta.toLocaleString('id-ID')} pack, siap{' '}
                                  {l.tersediaKemasan.toLocaleString('id-ID')} pack
                                  {!okPack && <> · kurang {l.defisitPack.toLocaleString('id-ID')} pack</>}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Ringkasan kecukupan */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-[11px]">
                            {cukup ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className={cukup ? 'text-emerald-700' : 'text-amber-700'}>
                              Stok curah: <span className="font-semibold">{cek.bulkKg.toLocaleString('id-ID')} kg</span>
                              {cek.butuhDariBulkKg > 0 && (
                                <span className="ml-1 text-slate-500">
                                  · perlu dikemas {cek.butuhDariBulkKg.toLocaleString('id-ID')} kg dari curah
                                </span>
                              )}
                              {!cukup && (
                                <span className="ml-1">
                                  · kurang <span className="font-bold">{cek.kekuranganKg.toLocaleString('id-ID')} kg</span>
                                </span>
                              )}
                            </span>
                          </div>
                          {!cukup && isEditable && (
                            <button
                              type="button"
                              onClick={() => openPengadaanModal(item, cek.kekuranganKg)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 active:scale-[0.98]"
                            >
                              <Sprout className="w-3.5 h-3.5" />
                              Teruskan ke Petani
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Harga & subtotal */}
                  <div className="px-3.5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Harga / kg</span>
                      {isEditable ? (
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] text-slate-400">Rp</span>
                          <input
                            type="number"
                            min={0}
                            value={u?.hargaPerUnit || ''}
                            onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-32 pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-700">Rp {price.toLocaleString('id-ID')}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Subtotal · {qty} kg</p>
                      <p className="text-sm font-bold text-emerald-700">Rp {(qty * price).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl px-4 py-3 mt-2">
            <span className="text-xs font-medium text-emerald-50">Total Estimasi Pengadaan</span>
            <span className="text-lg font-bold">Rp {grandTotal.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Informasi
            </h3>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Pemohon (Seller)</span>
              <div className="flex items-start gap-2.5">
                <Store className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{request.toko?.nama}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{request.toko?.alamat}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Gudang Penyedia</span>
              <div className="flex items-start gap-2.5">
                <Warehouse className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{request.gudang?.nama}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{request.gudang?.alamat}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Tanggal Pengajuan</span>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-slate-600">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Pengiriman Grosir Langsung */}
          {request.isPesananGrosir && request.lat && request.lng && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" />
                Pengiriman Langsung (Grosir)
              </h3>
              <div className="text-xs text-slate-700 font-medium mb-3 leading-relaxed">
                {request.alamatKirim || 'Alamat tidak tersedia'}
              </div>
              <div className="rounded-xl overflow-hidden h-48 border border-slate-200 relative bg-slate-50">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${request.lat},${request.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* Tindakan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Tindakan
            </h3>

            {['DIAJUKAN', 'DIPROSES', 'DIKIRIM'].includes(request.status) ? (
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-medium">Catatan (opsional)</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Instruksi logistik, nomor resi, atau alasan penolakan..."
                  className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            ) : (
              request.catatan && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium">Catatan</span>
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-3 border border-slate-100 rounded-xl leading-relaxed">
                    {request.catatan}
                  </p>
                </div>
              )
            )}

            {submitting ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {request.status === 'DIAJUKAN' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('DIPROSES')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Setujui &amp; Proses
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('DITOLAK')}
                      className="w-full py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all"
                    >
                      Tolak Pengajuan
                    </button>
                  </>
                )}

                {request.status === 'DIPROSES' && (
                  <button
                    onClick={() => handleStatusUpdate('DIKIRIM')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    Kirim Barang
                  </button>
                )}

                {request.status === 'DIKIRIM' && (
                  <button
                    onClick={() => handleStatusUpdate('SELESAI')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Selesaikan
                  </button>
                )}

                {['SELESAI', 'DITOLAK'].includes(request.status) && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col items-center gap-1.5">
                    {request.status === 'SELESAI' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-600">Pengadaan Selesai</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-500" />
                        <span className="text-xs font-semibold text-rose-500">Pengajuan Ditolak</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Teruskan ke Kepala Petani ─────────────────────────────────── */}
      {pengadaanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPengadaanModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-4 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Teruskan ke Kepala Petani</h3>
                <p className="text-[11px] text-emerald-50/80">{pengadaanModal.item.produk?.nama}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Ringkasan kekurangan */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 space-y-1">
                <div className="flex justify-between">
                  <span>Kebutuhan pesanan</span>
                  <span className="font-semibold">
                    {(itemUpdates.find((u) => u.itemId === pengadaanModal.item.id)?.jumlahDisetujui ?? pengadaanModal.item.jumlahPermintaan).toLocaleString('id-ID')} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stok curah tersedia</span>
                  <span className="font-semibold">{(Number(pengadaanModal.item.produkGudang?.stokBulk) || 0).toLocaleString('id-ID')} kg</span>
                </div>
                <div className="flex justify-between border-t border-amber-200/60 pt-1 mt-1">
                  <span className="font-semibold">Kekurangan</span>
                  <span className="font-bold text-amber-800">{pengadaanModal.kekuranganKg.toLocaleString('id-ID')} kg</span>
                </div>
              </div>

              {/* Kalkulator Penyusutan */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 space-y-1.5">
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-200/50">
                  <span className="font-bold flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" /> Kalkulator Penyusutan
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Penyusutan komoditas</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pengadaanModal.persenPenyusutan}
                      onChange={(e) => setPengadaanModal(p => p ? { ...p, persenPenyusutan: parseFloat(e.target.value) || 0 } : null)}
                      className="w-14 px-1.5 py-0.5 text-right border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold bg-white"
                    />
                    <span className="font-medium">%</span>
                  </div>
                </div>
                <div className="flex justify-between text-emerald-700/80">
                  <span>Kekurangan bersih</span>
                  <span>{pengadaanModal.kekuranganKg.toLocaleString('id-ID')} kg</span>
                </div>
                <div className="flex justify-between text-emerald-700/80">
                  <span>+ Tambahan Penyusutan ({pengadaanModal.persenPenyusutan}%)</span>
                  <span>{Math.round(pengadaanModal.kekuranganKg * (pengadaanModal.persenPenyusutan / 100) * 10) / 10} kg</span>
                </div>
              </div>

              {/* Tambah kilo (buffer) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Tambahan Kilo (buffer manual)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={pengadaanForm.tambahKg}
                    onChange={(e) => setPengadaanForm((p) => ({ ...p, tambahKg: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400">kg</span>
                </div>
                <div className="mt-3 p-2.5 bg-emerald-600 text-white rounded-lg flex justify-between items-center shadow-sm shadow-emerald-200">
                  <span className="text-[11px] font-medium">Total diajukan ke petani:</span>
                  <span className="font-black text-sm">
                    {Math.round((pengadaanModal.kekuranganKg + (pengadaanModal.kekuranganKg * (pengadaanModal.persenPenyusutan / 100)) + (parseFloat(pengadaanForm.tambahKg) || 0)) * 10) / 10} kg
                  </span>
                </div>
              </div>

              {/* Harga acuan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Harga Acuan per kg (opsional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={pengadaanForm.hargaAcuanPerKg}
                    onChange={(e) => setPengadaanForm((p) => ({ ...p, hargaAcuanPerKg: e.target.value }))}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Deadline panen */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Deadline Panen (opsional)</label>
                <input
                  type="date"
                  value={pengadaanForm.deadlinePanen}
                  onChange={(e) => setPengadaanForm((p) => ({ ...p, deadlinePanen: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={pengadaanForm.catatan}
                  onChange={(e) => setPengadaanForm((p) => ({ ...p, catatan: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPengadaanModal(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-white rounded-xl text-xs font-medium text-slate-500 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitPengadaan}
                disabled={pengadaanLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {pengadaanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Kirim ke Petani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PengajuanDetailPage;
