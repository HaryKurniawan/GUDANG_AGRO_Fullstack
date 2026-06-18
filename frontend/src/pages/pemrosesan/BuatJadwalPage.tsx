import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { jadwalProduksiApi, PreviewJadwalResult } from '../../api/jadwal-produksi.api';
import {
  ArrowLeft,
  CalendarDays,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  Loader2,
  Save,
  RotateCcw,
  Wallet,
  ChevronRight,
} from 'lucide-react';

const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

const BuatJadwalPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const gudangId = (user?.managedWarehouses as any[])?.[0]?.id || '';
  const gudangNama = (user?.managedWarehouses as any[])?.[0]?.nama || 'Gudang';

  // ── Form State ──
  const [form, setForm] = useState({
    komoditasNama: '',
    volumeTotalKg: '',
    tenggat: '',
    kapasitasHarianKg: '1000',
    catatanJadwal: '',
    pengajuanId: '',
  });

  // ── Preview & UI State ──
  const [preview, setPreview] = useState<PreviewJadwalResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isFormReady =
    form.komoditasNama.trim() !== '' &&
    parseFloat(form.volumeTotalKg) > 0 &&
    form.tenggat !== '';

  // ── Auto-hitung preview saat form berubah ──
  const hitungPreview = useCallback(async () => {
    if (!isFormReady) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const result = await jadwalProduksiApi.hitungPreview({
        volumeTotalKg: parseFloat(form.volumeTotalKg),
        tenggat: new Date(form.tenggat).toISOString(),
        kapasitasHarianKg: parseFloat(form.kapasitasHarianKg) || 1000,
      });
      setPreview(result);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal menghitung jadwal');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [form.volumeTotalKg, form.tenggat, form.kapasitasHarianKg, isFormReady]);

  useEffect(() => {
    const timer = setTimeout(hitungPreview, 600);
    return () => clearTimeout(timer);
  }, [hitungPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSimpan = async () => {
    if (!preview || !gudangId) {
      setSaveError('Lengkapi form dan pastikan preview sudah muncul');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const jadwal = await jadwalProduksiApi.create({
        gudangId,
        komoditasNama: form.komoditasNama.trim(),
        volumeTotalKg: parseFloat(form.volumeTotalKg),
        tenggat: new Date(form.tenggat).toISOString(),
        kapasitasHarianKg: parseFloat(form.kapasitasHarianKg) || 1000,
        pengajuanId: form.pengajuanId.trim() || undefined,
        catatanJadwal: form.catatanJadwal.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => navigate(`../${jadwal.id}`), 800);
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Gagal menyimpan jadwal');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      komoditasNama: '',
      volumeTotalKg: '',
      tenggat: '',
      kapasitasHarianKg: '1000',
      catatanJadwal: '',
      pengajuanId: '',
    });
    setPreview(null);
    setError(null);
    setSaveError(null);
  };

  // Min tanggal tenggat: besok
  const minTanggal = new Date();
  minTanggal.setDate(minTanggal.getDate() + 1);
  const minTanggalStr = minTanggal.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 md:p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm transition-all"
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-emerald-600" />
            Buat Jadwal Produksi
          </h1>
          <p className="text-xs text-gray-500">{gudangNama}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 max-w-6xl">
        {/* ════ KIRI: Form ════ */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Detail Produksi</h2>

            {/* Komoditas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Komoditas <span className="text-red-500">*</span>
              </label>
              <input
                id="komoditasNama"
                name="komoditasNama"
                type="text"
                value={form.komoditasNama}
                onChange={handleChange}
                placeholder="cth: Wortel, Buncis, Tomat..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Volume Total (kg) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="volumeTotalKg"
                  name="volumeTotalKg"
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.volumeTotalKg}
                  onChange={handleChange}
                  placeholder="cth: 2500"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-12 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">kg</span>
              </div>
              {form.volumeTotalKg && parseFloat(form.volumeTotalKg) > 0 && (
                <p className="mt-1 text-xs text-emerald-600">
                  ≈ {(parseFloat(form.volumeTotalKg) / 1000).toFixed(2)} ton
                </p>
              )}
            </div>

            {/* Tenggat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tenggat Pengiriman <span className="text-red-500">*</span>
              </label>
              <input
                id="tenggat"
                name="tenggat"
                type="date"
                min={minTanggalStr}
                value={form.tenggat}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>

            {/* Kapasitas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kapasitas Harian (kg)
              </label>
              <input
                id="kapasitasHarianKg"
                name="kapasitasHarianKg"
                type="number"
                min="100"
                step="100"
                max="10000"
                value={form.kapasitasHarianKg}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <p className="mt-1 text-xs text-gray-400">Default: 1.000 kg/hari (1 ton)</p>
            </div>

            {/* ID Pengajuan (opsional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ID Pengajuan Grosir <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                id="pengajuanId"
                name="pengajuanId"
                type="text"
                value={form.pengajuanId}
                onChange={handleChange}
                placeholder="Link ke pesanan e-commerce..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label>
              <textarea
                id="catatanJadwal"
                name="catatanJadwal"
                rows={3}
                value={form.catatanJadwal}
                onChange={handleChange}
                placeholder="Catatan tambahan untuk jadwal ini..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 p-4">
            <Lightbulb size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Jadwal dihitung <strong>otomatis</strong>: Tanggal mulai = tenggat − estimasi hari produksi.
              Biaya borongan pengupasan dihitung <strong>Rp 1.500/kg</strong>.
            </p>
          </div>
        </div>

        {/* ════ KANAN: Preview ════ */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">
              Preview Jadwal Otomatis
            </h2>

            {!isFormReady ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CalendarDays size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Isi komoditas, volume, dan tenggat</p>
                <p className="text-xs mt-1">untuk melihat jadwal otomatis</p>
              </div>
            ) : previewLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 size={28} className="animate-spin mb-2 text-emerald-500" />
                <p className="text-sm">Menghitung jadwal...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Mulai Produksi',
                      value: formatTanggal(preview.tanggalMulai),
                      icon: <Clock size={14} className="text-emerald-500" />,
                    },
                    {
                      label: 'Total Hari',
                      value: `${preview.estimasiHari} hari`,
                      icon: <CalendarDays size={14} className="text-blue-500" />,
                    },
                    {
                      label: 'Kapasitas/Hari',
                      value: `${(preview.kapasitasHarianKg / 1000).toFixed(1)} ton`,
                      icon: <Package size={14} className="text-purple-500" />,
                    },
                    {
                      label: 'Est. Biaya Borongan',
                      value: formatRupiah(preview.estimasiBiayaBorongan),
                      icon: <Wallet size={14} className="text-amber-500" />,
                    },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {s.icon}
                        <span className="text-xs text-gray-500">{s.label}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm leading-tight">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Warning Overlap */}
                {preview.peringatanOverlap.length > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold text-sm">
                      <AlertTriangle size={15} />
                      Peringatan Kapasitas Bentrok
                    </div>
                    {preview.peringatanOverlap.map((ov, i) => (
                      <div key={i} className="text-xs text-amber-600 flex justify-between border-t border-amber-200 pt-2 mt-2">
                        <span>{formatTanggal(ov.tanggal)}</span>
                        <span className="font-medium">+{ov.kelebihan.toFixed(0)} kg melebihi kapasitas</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabel Jadwal Harian */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rincian Per Hari</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold">Hari</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Tanggal</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Target (kg)</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Biaya Borongan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.hariProduksi.map((h) => (
                          <tr key={h.hariKe} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-semibold text-emerald-700">H-{h.hariKe}</td>
                            <td className="px-4 py-2.5 text-gray-600">{formatTanggal(h.tanggal)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {h.targetKg.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-2.5 text-right text-amber-600 font-medium">
                              {formatRupiah(h.targetKg * 1500)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50 border-t border-emerald-100">
                        <tr>
                          <td colSpan={2} className="px-4 py-2.5 font-bold text-emerald-800">Total</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-800">
                            {parseFloat(form.volumeTotalKg).toLocaleString('id-ID')} kg
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-amber-700">
                            {formatRupiah(preview.estimasiBiayaBorongan)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* HPP Note */}
                <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-700">
                    Estimasi biaya borongan <strong>{formatRupiah(preview.estimasiBiayaBorongan)}</strong> akan
                    masuk sebagai komponen biaya tenaga kerja dalam kalkulasi{' '}
                    <strong>HPP (Harga Pokok Produksi)</strong>.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Action Buttons ── */}
          {saveError && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-red-700 text-sm flex gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {saveError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-all"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              onClick={handleSimpan}
              disabled={!preview || saveLoading || saved || previewLoading}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                saved
                  ? 'bg-blue-500 text-white'
                  : !preview || saveLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 size={15} /> Tersimpan! Mengarahkan...
                </>
              ) : saveLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save size={15} /> Simpan Jadwal
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuatJadwalPage;
