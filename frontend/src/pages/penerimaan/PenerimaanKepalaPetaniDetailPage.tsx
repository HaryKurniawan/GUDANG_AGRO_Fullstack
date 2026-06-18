import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Loader2,
  ChevronLeft,
  Phone,
  Warehouse,
  Leaf,
  Calendar,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import api from '../../lib/api';

interface KepalaPetaniDetail {
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
  gudang: {
    id: string;
    kode: string;
    nama: string;
  } | null;
}

interface AnggotaPetani {
  id: string;
  petaniId: string;
  petaniNama: string;
  petaniNik: string;
  noHp: string;
  role: string;
  status: string;
  createdAt: string;
}

const PenerimaanKepalaPetaniDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [kepala, setKepala] = useState<KepalaPetaniDetail | null>(null);
  const [anggotaList, setAnggotaList] = useState<AnggotaPetani[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/afiliasi/kepala-petani/${id}`);
      const data = res.data;

      if (data.statusCode === 200) {
        setKepala(data.data.kepalaPetani);
        setAnggotaList(data.data.anggota || []);
      } else {
        setError(data.message || 'Gagal memuat data');
      }
    } catch (err: any) {
      console.error('Error fetching kepala petani detail:', err);
      if (err.response?.status === 404) {
        setError('Kepala petani tidak ditemukan di data afiliasi gudang.');
      } else {
        setError(
          err.response?.data?.message || 'Gagal memuat data detail kepala petani.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const getStatusBadge = (status: string) => {
    if (status === 'aktif') {
      return { bg: 'bg-green-50 text-green-600 border-green-100', dot: 'bg-green-500', label: 'Aktif' };
    }
    return { bg: 'bg-slate-50 text-slate-500 border-slate-100', dot: 'bg-slate-300', label: 'Nonaktif' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="text-sm font-medium">Memuat detail kepala petani...</span>
        </div>
      </div>
    );
  }

  if (error || !kepala) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => {
            const backPath = location.pathname.split('/kepala-petani')[0] + '/kepala-petani';
            navigate(backPath);
          }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar
        </button>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {error || 'Kepala petani tidak ditemukan'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Pastikan kepala petani sudah melakukan afiliasi dari app PETANI.
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

  const kepalaBadge = getStatusBadge(kepala.status);

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => {
          const backPath = location.pathname.split('/kepala-petani')[0] + '/kepala-petani';
          navigate(backPath);
        }}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Kembali ke Daftar
      </button>

      {/* Kepala Petani Info Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-3xl flex-shrink-0">
            👨‍🌾
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">{kepala.petaniNama || 'Tanpa Nama'}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${kepalaBadge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${kepalaBadge.dot}`}></span>
                {kepalaBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Kepala Petani • ID: {kepala.petaniId.substring(0, 12)}...</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {kepala.noHp && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              <span className="truncate">{kepala.noHp}</span>
            </div>
          )}
          {kepala.petaniNik && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              <span className="truncate">NIK: {kepala.petaniNik}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <span>Terdaftar: {new Date(kepala.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {kepala.gudang && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Warehouse className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              <span className="truncate">{kepala.gudang.nama}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-xl font-bold text-green-600">{anggotaList.length}</p>
            <p className="text-[10px] text-green-600 font-medium mt-0.5">Petani Anggota</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <p className="text-xl font-bold text-slate-700">{kepala.gudangId}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Kode Gudang</p>
          </div>
        </div>
      </div>

      {/* Anggota List */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Users size={14} className="text-green-600" />
            Anggota Petani
            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
              {anggotaList.length}
            </span>
          </h2>
        </div>

        <div className="p-4">
          {anggotaList.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              <Leaf className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada petani anggota terafiliasi</p>
              <p className="text-[10px] text-slate-300 mt-1">
                Petani anggota akan muncul setelah mereka sync afiliasi dari app PETANI
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {anggotaList.map((anggota) => {
                const badge = getStatusBadge(anggota.status);
                return (
                  <div
                    key={anggota.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:border-green-100 hover:bg-green-50/20 transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-base flex-shrink-0">
                      🌾
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {anggota.petaniNama || 'Tanpa Nama'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {anggota.noHp && (
                          <span className="text-[11px] text-slate-400">{anggota.noHp}</span>
                        )}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PenerimaanKepalaPetaniDetailPage;
