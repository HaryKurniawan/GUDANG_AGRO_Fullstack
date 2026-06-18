import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import {
  Tag,
  Plus,
  Loader2,
  Check,
  X,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
} from 'lucide-react';

interface MasterVarian {
  id: string;
  nama: string;
  deskripsi?: string | null;
  isActive: boolean;
}

interface PengajuanVarian {
  id: string;
  nama: string;
  deskripsi?: string | null;
  alasan?: string | null;
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
  catatanAdmin?: string | null;
  createdAt: string;
}

const MasterVarianPage: React.FC = () => {
  const [tab, setTab] = useState<'master' | 'pengajuan'>('pengajuan');
  const [masterList, setMasterList] = useState<MasterVarian[]>([]);
  const [pengajuanList, setPengajuanList] = useState<PengajuanVarian[]>([]);
  const [loading, setLoading] = useState(true);

  // Create master modal
  const [modalOpen, setModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [masterRes, pengajuanRes] = await Promise.all([
        api.get('/varian/master'),
        api.get('/varian/pengajuan'),
      ]);
      setMasterList(masterRes.data?.data || []);
      setPengajuanList(pengajuanRes.data?.data || []);
    } catch (err) {
      console.error('Gagal memuat data varian:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError('Nama varian wajib diisi');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/varian/master', { nama: nama.trim(), deskripsi: deskripsi.trim() || undefined });
      setModalOpen(false);
      setNama('');
      setDeskripsi('');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat varian');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (v: MasterVarian) => {
    try {
      await api.put(`/varian/master/${v.id}`, { isActive: !v.isActive });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah status');
    }
  };

  const handleDeleteMaster = async (v: MasterVarian) => {
    if (!confirm(`Hapus varian "${v.nama}" dari master?`)) return;
    try {
      await api.delete(`/varian/master/${v.id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus varian');
    }
  };

  const handleApprove = async (p: PengajuanVarian) => {
    if (!confirm(`Setujui varian "${p.nama}"? Varian akan ditambahkan ke master.`)) return;
    try {
      await api.patch(`/varian/pengajuan/${p.id}/approve`, {});
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyetujui');
    }
  };

  const handleReject = async (p: PengajuanVarian) => {
    const catatan = prompt(`Tolak varian "${p.nama}"? Beri catatan (opsional):`);
    if (catatan === null) return;
    try {
      await api.patch(`/varian/pengajuan/${p.id}/reject`, { catatanAdmin: catatan || undefined });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak');
    }
  };

  const formatTanggal = (v: string) =>
    new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const pendingCount = pengajuanList.filter((p) => p.status === 'MENUNGGU').length;

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    MENUNGGU: { label: 'Menunggu', className: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Clock size={12} /> },
    DISETUJUI: { label: 'Disetujui', className: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle size={12} /> },
    DITOLAK: { label: 'Ditolak', className: 'text-red-700 bg-red-50 border-red-200', icon: <XCircle size={12} /> },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6">
        <span className="text-xs font-semibold tracking-wider uppercase text-green-100">Master Data</span>
        <h2 className="text-xl font-bold mt-1 text-white">Master Varian Produk</h2>
        <p className="text-xs mt-1.5 text-green-100 leading-relaxed">
          Kelola daftar varian produk yang boleh dipakai gudang, dan tinjau pengajuan varian baru dari kepala gudang.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-2 rounded-xl w-fit">
        <button
          onClick={() => setTab('pengajuan')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            tab === 'pengajuan' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
          }`}
        >
          <Inbox size={14} /> Pengajuan
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('master')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            tab === 'master' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
          }`}
        >
          <Tag size={14} /> Master Varian {masterList.length}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      ) : tab === 'master' ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setError(''); setNama(''); setDeskripsi(''); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" /> Tambah Varian
            </button>
          </div>
          {masterList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Tag size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium">Belum ada master varian</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">Nama Varian</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">Deskripsi</th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{v.nama}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{v.deskripsi || '-'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleActive(v)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            v.isActive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'
                          }`}
                        >
                          {v.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleDeleteMaster(v)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        // Tab Pengajuan
        pengajuanList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Inbox size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-medium">Belum ada pengajuan varian</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">Varian</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">Alasan</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500">Diajukan</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pengajuanList.map((p) => {
                  const cfg = statusConfig[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{p.nama}</p>
                        {p.deskripsi && <p className="text-[11px] text-slate-400 mt-0.5">{p.deskripsi}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs max-w-[200px]">{p.alasan || '-'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.className}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{formatTanggal(p.createdAt)}</td>
                      <td className="px-5 py-3.5 text-center">
                        {p.status === 'MENUNGGU' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(p)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Check size={13} /> Setujui
                            </button>
                            <button
                              onClick={() => handleReject(p)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <X size={13} /> Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{p.catatanAdmin || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal Create Master */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={18} className="text-emerald-600" />
              <h3 className="font-bold text-lg text-slate-800">Tambah Master Varian</h3>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <form onSubmit={handleCreateMaster} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Varian *</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Contoh: Frozen, Premium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deskripsi (opsional)</label>
                <input
                  type="text"
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Penjelasan singkat"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterVarianPage;
