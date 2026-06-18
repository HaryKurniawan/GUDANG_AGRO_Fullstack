import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {Loader2,
  User,
  Shield,
  Phone,
  Mail,
  Warehouse,
  Crown,
} from 'lucide-react';

interface KepalasGudang {
  id: string;
  nama: string | null;
  email: string;
  noTelepon: string | null;
  peran: string;
  managedWarehouses: { id: string; nama: string; kode: string }[];
}

interface StafInfoData {
  staf: { id: string; nama: string | null; email: string; peran: string; noTelepon: string | null };
  managedWarehouses: any[];
  kepalasGudang: KepalasGudang[];
}

const StafInfoPage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<StafInfoData | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api.get('/laporan/staf-info');
        setInfo(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  const getRoleLabel = (peran: string) => {
    switch (peran) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN_GUDANG': return 'Kepala Gudang';
      case 'STAF_GUDANG': return 'Staf Operasional';
      default: return peran;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Informasi Tim Gudang</h1>
        <p className="text-xs text-slate-400 mt-0.5">Profil Anda dan struktur tim gudang</p>
      </div>

      {/* My Profile */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{user?.nama || info?.staf.nama || 'Staf Gudang'}</h2>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">
              {getRoleLabel(user?.peran || '')}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mail size={13} className="text-slate-300" />
            {user?.email || info?.staf.email}
          </div>
          {(user?.managedWarehouses || []).length > 0 && (
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Warehouse size={13} className="text-slate-300 mt-0.5" />
              <div>
                {(user?.managedWarehouses || []).map((w: any) => (
                  <span key={w.id} className="block">{w.nama} ({w.kode})</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kepala Gudang (Atasan) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Crown size={14} className="text-amber-500" />
          Kepala Gudang (Atasan)
        </h3>

        {!info || info.kepalasGudang.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Belum ada kepala gudang terdaftar</p>
        ) : (
          <div className="space-y-3">
            {info.kepalasGudang.map(kepala => (
              <div key={kepala.id} className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">{kepala.nama || '—'}</p>
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                      {getRoleLabel(kepala.peran)}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Mail size={10} className="text-slate-300" />
                      {kepala.email}
                    </div>
                    {kepala.noTelepon && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Phone size={10} className="text-slate-300" />
                        {kepala.noTelepon}
                      </div>
                    )}
                    {kepala.managedWarehouses.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Warehouse size={10} className="text-slate-300" />
                        {kepala.managedWarehouses.map(w => w.nama).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info gudang dikelola */}
      {user && (user.managedWarehouses || []).length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Warehouse size={14} className="text-emerald-500" />
            Gudang Anda
          </h3>
          <div className="space-y-2">
            {(user.managedWarehouses || []).map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Warehouse size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{w.nama}</p>
                  <p className="text-[10px] text-slate-400">Kode: {w.kode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StafInfoPage;
