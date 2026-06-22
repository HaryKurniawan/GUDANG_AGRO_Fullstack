import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send, Package,
  Loader2,
  TrendingUp, TrendingDown, Minus, Users,
  Archive, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api');

const fmtKg = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}t` : `${n.toFixed(1)}kg`;
const fmtRp = (n: number) => n >= 1_000_000
  ? `Rp ${(n / 1_000_000).toFixed(1)}jt`
  : `Rp ${n.toLocaleString('id-ID')}`;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:               { label: 'Draft',           color: 'bg-gray-100 text-gray-600' },
  TERKIRIM:            { label: 'Terkirim',         color: 'bg-blue-100 text-blue-700' },
  SEBAGIAN_TERPENUHI:  { label: 'Sebagian',         color: 'bg-amber-100 text-amber-700' },
  TERPENUHI:           { label: 'Terpenuhi',        color: 'bg-green-100 text-green-700' },
  DIBATALKAN:          { label: 'Dibatalkan',       color: 'bg-red-100 text-red-600' },
};

interface PermintaanPengadaan {
  id: string;
  komoditasNama: string;
  targetKg: number;
  totalKomitmenKg: number;
  jumlahKepalaPetaniRespon: number;
  hargaAcuanPerKg: number | null;
  deadlinePanen: string | null;
  trendPersen: number | null;
  trendArah: string | null;
  status: string;
  periode: string;
  createdAt: string;
}

const DaftarPermintaanPage: React.FC = () => {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);

  const [myGudangId, setMyGudangId] = useState<string | null>(null);
  const [permintaanList, setPermintaanList] = useState<PermintaanPengadaan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingKirim, setLoadingKirim] = useState<string | null>(null);

  // Ambil gudang user
  useEffect(() => {
    if (user?.managedWarehouses && user.managedWarehouses.length > 0) {
      setMyGudangId(user.managedWarehouses[0].id);
    }
  }, [user]);

  const fetchPermintaanList = async () => {
    if (!myGudangId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/permintaan-pengadaan`, {
        params: { gudangId: myGudangId },
        headers: { Authorization: `Bearer ${token}` },
      });
      setPermintaanList(res.data?.data || []);
    } catch (err) {
      console.error('Gagal ambil permintaan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (myGudangId) {
      fetchPermintaanList();
    }
  }, [myGudangId]);

  const handleKirim = async (id: string) => {
    setLoadingKirim(id);
    try {
      await axios.post(`${API}/permintaan-pengadaan/${id}/kirim`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPermintaanList();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mengirim');
    } finally {
      setLoadingKirim(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive size={24} className="text-emerald-600" />
            Riwayat Permintaan Pengadaan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar seluruh permintaan pengadaan komoditas yang diajukan ke kepala petani.
          </p>
        </div>
        <button
          onClick={fetchPermintaanList}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
          </div>
        ) : permintaanList.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <Package size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Belum ada riwayat permintaan pengadaan.</p>
          </div>
        ) : (
          permintaanList.map(pp => {
            const cfg = STATUS_CONFIG[pp.status] || STATUS_CONFIG.DRAFT;
            const persen = pp.targetKg > 0 ? Math.min((pp.totalKomitmenKg / pp.targetKg) * 100, 100) : 0;

            return (
              <div key={pp.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{pp.komoditasNama}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span>Target: <strong className="text-gray-700">{fmtKg(pp.targetKg)}</strong></span>
                        {pp.hargaAcuanPerKg && (
                          <span>Harga acuan: <strong className="text-gray-700">{fmtRp(pp.hargaAcuanPerKg)}/kg</strong></span>
                        )}
                        {pp.deadlinePanen && <span>Deadline: <strong className="text-gray-700">{pp.deadlinePanen}</strong></span>}
                        <span>Periode: {pp.periode}</span>
                      </div>
                      {pp.trendArah && (
                        <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${
                          pp.trendArah === 'UP' ? 'text-emerald-600' :
                          pp.trendArah === 'DOWN' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {pp.trendArah === 'UP' ? <TrendingUp size={11} /> : pp.trendArah === 'DOWN' ? <TrendingDown size={11} /> : <Minus size={11} />}
                          {pp.trendPersen !== null ? `${pp.trendPersen > 0 ? '+' : ''}${pp.trendPersen}% vs bulan lalu` : 'Tren stabil'}
                        </div>
                      )}
                    </div>

                    {pp.status === 'DRAFT' && (
                      <button
                        onClick={() => handleKirim(pp.id)}
                        disabled={loadingKirim === pp.id}
                        className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-60 flex-shrink-0 shadow-lg shadow-emerald-100"
                      >
                        {loadingKirim === pp.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        Kirim ke Petani
                      </button>
                    )}
                  </div>

                  {/* Progress komitmen */}
                  {(pp.status === 'TERKIRIM' || pp.status === 'SEBAGIAN_TERPENUHI' || pp.status === 'TERPENUHI') && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {pp.jumlahKepalaPetaniRespon} kepala petani merespon
                        </span>
                        <span className="font-semibold text-gray-700">
                          {fmtKg(pp.totalKomitmenKg)} / {fmtKg(pp.targetKg)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            persen >= 100 ? 'bg-emerald-500' : persen >= 50 ? 'bg-amber-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{persen.toFixed(0)}% terpenuhi</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DaftarPermintaanPage;
