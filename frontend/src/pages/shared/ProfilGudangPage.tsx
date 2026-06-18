import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  Settings,
  Warehouse,
  Phone,
  Mail,
  User,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

const ProfilGudangPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User profile form
  const [nama, setNama] = useState('');
  const [noTelepon, setNoTelepon] = useState('');

  // Gudang info (read-only display)
  const [gudangInfo, setGudangInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setNama(user.nama || '');
      setNoTelepon(user.noTelepon || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchGudang = async () => {
      try {
        setLoading(true);
        const res = await api.get('/gudang/admin/my');
        const data = res.data.data;
        if (Array.isArray(data) && data.length > 0) {
          setGudangInfo(data[0]);
        } else if (data && !Array.isArray(data)) {
          setGudangInfo(data);
        }
      } catch (err) {
        console.error('Gagal memuat data gudang:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGudang();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/auth/me', { nama, noTelepon });
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      fetchProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan profil' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          Profil & Pengaturan
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Kelola data akun dan lihat informasi gudang yang Anda kelola.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Edit Profile */}
        <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            Data Akun
          </h2>

          {message && (
            <div className={`p-3 rounded-xl text-xs font-medium border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {message.type === 'success' && <Check className="w-3 h-3 inline mr-1" />}
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Email tidak dapat diubah</p>
            </div>

            {/* Nama */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Nama Lengkap
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* No Telepon */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> No. Telepon
              </label>
              <input
                type="text"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Peran</label>
              <span className="inline-block px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                {user?.peran === 'ADMIN_GUDANG' ? 'Kepala Gudang' : user?.peran === 'SUPER_ADMIN' ? 'Super Admin' : user?.peran || '-'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

        {/* Right: Gudang Info (read-only) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Warehouse className="w-4 h-4 text-emerald-600" />
            Informasi Gudang
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : gudangInfo ? (
            <div className="space-y-4">
              {[
                { label: 'Nama Gudang', value: gudangInfo.nama },
                { label: 'Kode', value: gudangInfo.kode },
                { label: 'Alamat', value: gudangInfo.alamat },
                { label: 'Kabupaten', value: gudangInfo.kabupaten },
                { label: 'Tipe', value: gudangInfo.tipe },
                { label: 'Status', value: gudangInfo.status },
                { label: 'Kapasitas', value: gudangInfo.kapasitasKg ? `${gudangInfo.kapasitasKg.toLocaleString('id-ID')} kg` : '-' },
                { label: 'Terpakai', value: gudangInfo.kapasitasTerpakai ? `${gudangInfo.kapasitasTerpakai.toLocaleString('id-ID')} kg` : '0 kg' },
                { label: 'Telepon Gudang', value: gudangInfo.telepon || '-' },
                { label: 'Email Gudang', value: gudangInfo.email || '-' },
                { label: 'Jam Operasional', value: gudangInfo.jamOperasional || '-' },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-400 flex-shrink-0">{item.label}</span>
                  <span className="text-xs font-semibold text-slate-700 text-right">{item.value || '-'}</span>
                </div>
              ))}

              {gudangInfo.catatan && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Catatan</span>
                  <p className="text-xs text-slate-600 mt-1">{gudangInfo.catatan}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-xs">Belum ada gudang yang ditugaskan ke akun Anda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilGudangPage;
