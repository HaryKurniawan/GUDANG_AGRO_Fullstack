import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Search, Loader2, MapPin, ChevronRight, XCircle, RefreshCw, Warehouse } from 'lucide-react';

interface KepalaPetaniAfiliasi {
  id: string;
  petaniId: string;
  kepalaPetaniId: string | null;
  gudangId: string;
  petaniNama: string;
  petaniNik: string;
  noHp: string;
  role: string;
  status: string;
  gudangRefId: string | null;
  createdAt: string;
  updatedAt: string;
  jumlahAnggota: number;
  gudang: {
    id: string;
    kode: string;
    nama: string;
  } | null;
}

const PenerimaanKepalaPetaniListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [kepalaPetaniList, setKepalaPetaniList] = useState<KepalaPetaniAfiliasi[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'aktif' | 'nonaktif'>('aktif');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch kepala petani directly from PETANI backend
      const petaniUrl = 'http://localhost:5000';
      const res = await fetch(`${petaniUrl}/api/all-data`);
      if (!res.ok) throw new Error('Gagal menghubungi PETANI service');
      const allData = await res.json();

      // Filter petani with role 'kepala_petani'
      let kepalaPetaniRaw = (allData.petani || []).filter(
        (p: any) => p.role === 'kepala_petani' && p.statusVerifikasi === 'approved'
      );

      // Apply search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        kepalaPetaniRaw = kepalaPetaniRaw.filter((p: any) =>
          (p.nama || '').toLowerCase().includes(q) ||
          (p.noHp || '').toLowerCase().includes(q)
        );
      }

      // Count petani members per kepala petani
      const allPetani = (allData.petani || []).filter((p: any) => p.role === 'petani');

      const mapped: KepalaPetaniAfiliasi[] = kepalaPetaniRaw.map((kp: any) => ({
        id: kp.id,
        petaniId: kp.id,
        kepalaPetaniId: null,
        gudangId: kp.gudangTujuanId || '',
        petaniNama: kp.nama,
        petaniNik: kp.nik,
        noHp: kp.noHp,
        role: kp.role,
        status: 'aktif',
        gudangRefId: kp.gudangTujuanId,
        createdAt: kp.tanggalDaftar,
        updatedAt: kp.tanggalDaftar,
        jumlahAnggota: allPetani.filter((p: any) => p.kepalaPetaniId === kp.id).length,
        gudang: kp.gudangTujuanNama ? { id: kp.gudangTujuanId || '', kode: '', nama: kp.gudangTujuanNama } : null,
      }));

      setKepalaPetaniList(mapped);
    } catch (err: any) {
      console.error('Error fetching kepala petani:', err);
      setError(
        'Tidak dapat memuat data kepala petani. Pastikan PETANI backend berjalan di port 5000.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const getStatusBadge = (status: string) => {
    if (status === 'aktif') {
      return { bg: 'bg-green-50 text-green-600 border-green-100', dot: 'bg-green-500', label: 'Aktif' };
    }
    return { bg: 'bg-slate-50 text-slate-500 border-slate-100', dot: 'bg-slate-300', label: 'Nonaktif' };
  };

  if (loading && kepalaPetaniList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="text-sm font-medium">Memuat data kepala petani terafiliasi...</span>
        </div>
      </div>
    );
  }

  if (error && kepalaPetaniList.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kepala Petani Terafiliasi</h1>
          <p className="text-xs text-slate-400 mt-0.5">Daftar kepala petani yang terhubung dengan gudang ini</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Gagal memuat data</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <p className="text-xs text-slate-500 mt-3">
                Data afiliasi dikirim otomatis dari PETANI service saat kepala petani mendaftar ke gudang.
              </p>
              <button
                onClick={fetchData}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 inline-flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kepala Petani Terafiliasi</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {kepalaPetaniList.length} kepala petani terhubung dengan gudang
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder="Cari nama kepala petani..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 bg-white"
          />
        </div>
        <div className="flex gap-1.5">
          {(['aktif', 'nonaktif', 'semua'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s === 'semua' ? 'Semua' : s === 'aktif' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <Warehouse size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          Data ini di-sync otomatis dari PETANI service saat kepala petani mendaftar afiliasi ke gudang.
          Jika belum ada data, pastikan kepala petani sudah melakukan registrasi afiliasi dari app PETANI.
        </span>
      </div>

      {/* Cards Grid */}
      {kepalaPetaniList.length === 0 ? (
        <div className="text-center py-16 text-slate-300">
          <Users className="w-10 h-10 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">
            Belum ada kepala petani terafiliasi
          </p>
          <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
            Kepala petani perlu mendaftar afiliasi dari app PETANI. Setelah itu, data akan muncul otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kepalaPetaniList.map((kp) => {
            const badge = getStatusBadge(kp.status);
            return (
              <div
                key={kp.id}
                onClick={() => {
                  // Navigate relative to current path prefix
                  const pathPrefix = location.pathname.split('/kepala-petani')[0];
                  navigate(`${pathPrefix}/kepala-petani/${kp.petaniId}`);
                }}
                className="bg-white border border-slate-100 rounded-2xl p-4 cursor-pointer hover:border-green-200 hover:shadow-md transition-all group"
              >
                {/* Top row: avatar + name + status */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-xl flex-shrink-0">
                    👨‍🌾
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-green-700 transition-colors">
                        {kp.petaniNama || 'Tanpa Nama'}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-400 transition-colors flex-shrink-0" />
                    </div>
                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="mt-3 space-y-1.5">
                  {kp.noHp && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{kp.noHp}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{kp.jumlahAnggota} petani anggota</span>
                  </div>
                  {kp.gudang && (
                    <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5 truncate">
                      Gudang: {kp.gudang.nama}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PenerimaanKepalaPetaniListPage;
