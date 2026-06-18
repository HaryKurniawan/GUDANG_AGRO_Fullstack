/**
 * Komponen untuk menampilkan daftar Kepala Petani yang terafiliasi dengan gudang
 * Digunakan di:
 * - /kepala-gudang/ajukan-kebutuhan (show who will receive requests)
 * - /kepala-gudang/penerimaan (show who will send harvests)
 */

import React, { useEffect, useState } from 'react';
import { Loader2, Users, AlertTriangle, Phone, MapPin } from 'lucide-react';
import { getKepalaPetaniTerafiliasi } from '../../lib/api';

interface KepalaPetani {
  id: string;
  petaniId: string;
  petaniNama: string;
  petaniNik: string;
  noHp: string;
  gudangId: string;
  gudang: {
    id: string;
    kode: string;
    nama: string;
  };
  status: string;
  jumlahAnggota?: number;
  createdAt: string;
}

interface Props {
  gudangKode?: string;
  title?: string;
  description?: string;
  compact?: boolean; // true = smaller cards, false = full cards
}

export const AfiliasiKepalaPetaniCard: React.FC<Props> = ({
  gudangKode,
  title = 'Kepala Petani Terafiliasi',
  description = 'Kepala petani yang terhubung dengan gudang ini akan menerima permintaan pengadaan',
  compact = false,
}) => {
  const [kepalaPetaniList, setKepalaPetaniList] = useState<KepalaPetani[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKepalaPetani = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (gudangKode) params.append('gudangKode', gudangKode);
        params.append('status', 'aktif');
        
        const response = await getKepalaPetaniTerafiliasi(gudangKode, 'aktif');
        setKepalaPetaniList(response.data || []);
      } catch (err: any) {
        console.error('Failed to fetch kepala petani:', err);
        setError(err.response?.data?.message || 'Gagal mengambil data kepala petani');
      } finally {
        setLoading(false);
      }
    };

    fetchKepalaPetani();
  }, [gudangKode]);

  if (loading) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white border border-gray-100 rounded-2xl`}>
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Memuat data kepala petani...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-red-50 border border-red-100 rounded-2xl`}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-white border border-gray-100 rounded-2xl`}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Users size={18} className="text-emerald-600" />
          <h3 className={`font-bold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {title}
          </h3>
        </div>
        {description && (
          <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'} mt-1`}>
            {description}
          </p>
        )}
      </div>

      {/* List */}
      {kepalaPetaniList.length === 0 ? (
        <div className={`text-center py-${compact ? '6' : '10'}`}>
          <Users size={32} className="mx-auto text-gray-200 mb-2" />
          <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
            Belum ada kepala petani yang terafiliasi
          </p>
        </div>
      ) : (
        <div className={`space-y-${compact ? '2' : '3'}`}>
          {kepalaPetaniList.map((kp) => (
            <div
              key={kp.petaniId}
              className={`${
                compact ? 'p-3' : 'p-4'
              } bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl hover:shadow-md transition-shadow`}
            >
              {/* Name & ID */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`font-semibold text-emerald-900 ${compact ? 'text-sm' : 'text-base'}`}>
                    {kp.petaniNama}
                  </p>
                  <p className={`text-emerald-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    NIK: {kp.petaniNik}
                  </p>
                </div>
                {kp.jumlahAnggota !== undefined && (
                  <div className="text-right">
                    <p className={`font-bold text-emerald-700 ${compact ? 'text-sm' : 'text-base'}`}>
                      {kp.jumlahAnggota}
                    </p>
                    <p className={`text-emerald-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                      anggota
                    </p>
                  </div>
                )}
              </div>

              {/* Contact & Location */}
              <div className={`space-y-${compact ? '1' : '1.5'} ${compact ? 'text-xs' : 'text-sm'}`}>
                <div className="flex items-center gap-2 text-emerald-600">
                  <Phone size={compact ? 12 : 14} className="flex-shrink-0" />
                  <span>{kp.noHp || 'No HP tidak tersedia'}</span>
                </div>
                {kp.gudang && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <MapPin size={compact ? 12 : 14} className="flex-shrink-0" />
                    <span>{kp.gudang.nama}</span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-3">
                <span className={`inline-block ${
                  kp.status === 'aktif'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                } ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} rounded-full font-semibold`}>
                  {kp.status === 'aktif' ? '✓ Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>
          ))}

          {/* Total Summary */}
          <div className={`mt-4 pt-4 border-t border-emerald-100 text-center`}>
            <p className={`text-emerald-700 font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
              📊 Total {kepalaPetaniList.length} kepala petani aktif
            </p>
            {kepalaPetaniList.reduce((sum, kp) => sum + (kp.jumlahAnggota || 0), 0) > 0 && (
              <p className={`text-emerald-600 ${compact ? 'text-[10px]' : 'text-xs'} mt-1`}>
                🌾 {kepalaPetaniList.reduce((sum, kp) => sum + (kp.jumlahAnggota || 0), 0)} petani anggota
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AfiliasiKepalaPetaniCard;
