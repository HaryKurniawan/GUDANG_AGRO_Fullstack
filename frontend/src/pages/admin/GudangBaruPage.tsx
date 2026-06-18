import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Warehouse, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { gudangApi } from '../../api/gudang.api';

interface FormData {
  nama: string;
  kode: string;
  tipe: string;
  alamat: string;
  kabupaten: string;
  provinsi: string;
  telepon: string;
  email: string;
  kapasitasKg: string;
  jamOperasional: string;
}

const EMPTY_FORM: FormData = {
  nama: '',
  kode: '',
  tipe: 'REGIONAL',
  alamat: '',
  kabupaten: '',
  provinsi: 'Jawa Barat',
  telepon: '',
  email: '',
  kapasitasKg: '',
  jamOperasional: '08:00 - 17:00',
};

const TIPE_OPTIONS = ['REGIONAL', 'PUSAT', 'SATELIT'];

const GudangBaruPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.nama || !form.kode || !form.alamat || !form.kabupaten || !form.provinsi) {
      setError('Nama, kode, alamat, kabupaten, dan provinsi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await gudangApi.createGudang({
        nama: form.nama,
        kode: form.kode.toUpperCase(),
        tipe: form.tipe,
        alamat: form.alamat,
        kabupaten: form.kabupaten,
        provinsi: form.provinsi,
        telepon: form.telepon || undefined,
        email: form.email || undefined,
        kapasitasKg: form.kapasitasKg ? parseFloat(form.kapasitasKg) : undefined,
        jamOperasional: form.jamOperasional || undefined,
      });

      setSuccess('Gudang berhasil dibuat!');
      setTimeout(() => navigate('/admin/gudang'), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal membuat gudang.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/gudang')}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-emerald-600" />
            Tambah Gudang Baru
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Daftarkan gudang baru ke dalam sistem</p>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700 font-medium">{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Nama & Kode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Nama Gudang <span className="text-red-500">*</span>
            </label>
            <input
              name="nama"
              value={form.nama}
              onChange={handleChange}
              placeholder="Gudang Bandung Utara"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Kode Gudang <span className="text-red-500">*</span>
            </label>
            <input
              name="kode"
              value={form.kode}
              onChange={handleChange}
              placeholder="GDG-BDG-UTR"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        {/* Tipe */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Tipe Gudang
          </label>
          <select
            name="tipe"
            value={form.tipe}
            onChange={handleChange}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {TIPE_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Alamat */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Alamat Lengkap <span className="text-red-500">*</span>
          </label>
          <textarea
            name="alamat"
            value={form.alamat}
            onChange={handleChange}
            rows={3}
            placeholder="Jl. Contoh No. 123, Kel. Contoh"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            required
          />
        </div>

        {/* Kabupaten & Provinsi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Kabupaten/Kota <span className="text-red-500">*</span>
            </label>
            <input
              name="kabupaten"
              value={form.kabupaten}
              onChange={handleChange}
              placeholder="Kab. Bandung"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Provinsi <span className="text-red-500">*</span>
            </label>
            <input
              name="provinsi"
              value={form.provinsi}
              onChange={handleChange}
              placeholder="Jawa Barat"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        {/* Telepon & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Telepon
            </label>
            <input
              name="telepon"
              value={form.telepon}
              onChange={handleChange}
              placeholder="022-1234567"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="gudang@agrojabar.co.id"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Kapasitas & Jam */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Kapasitas (kg)
            </label>
            <input
              name="kapasitasKg"
              type="number"
              min="0"
              value={form.kapasitasKg}
              onChange={handleChange}
              placeholder="50000"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Jam Operasional
            </label>
            <input
              name="jamOperasional"
              value={form.jamOperasional}
              onChange={handleChange}
              placeholder="08:00 - 17:00"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/admin/gudang')}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Gudang'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GudangBaruPage;
