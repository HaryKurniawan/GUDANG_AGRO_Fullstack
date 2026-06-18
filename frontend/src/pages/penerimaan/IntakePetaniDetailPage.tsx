import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Scale,
  FileCheck,
  Check,
  AlertCircle,
  Loader2,
  Truck,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface IntakePetani {
  id: string;
  nomorPenerimaan: string;
  permintaanPengadaanId: string;
  petaniId: string;
  petaniNama: string;
  komoditasNama: string;
  kodeKomoditasGlobal: string | null;
  sanggupKg: number;
  estimasiTanggalPanen: string | null;
  intakeStatus: 'menunggu_penerimaan' | 'diterima' | 'ditimbang' | 'selesai';
  beratAsliKg: number | null;
  terimaAt: string | null;
  ditimbangAt: string | null;
  buktiPembayaranUrl: string | null;
  uploadBuktiAt: string | null;
  createdAt: string;
  catatan: string | null;
}

const IntakePetaniDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [intake, setIntake] = useState<IntakePetani | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntake = async () => {
    try {
      const res = await api.get(`/penerimaan/${id}`);
      const data = res.data.data;
      if (data.intakeStatus) {
        setIntake(data);
      } else {
        setError('Data intake tidak valid');
      }
    } catch (err: any) {
      console.error('Failed to fetch intake:', err);
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntake();
  }, [id]);

  const handleTerima = async () => {
    if (!intake) return;
    try {
      await api.post(`/penerimaan/${intake.id}/terima`, {
        catatan: `Barang diterima dari ${intake.petaniNama}`,
      });
      setIntake((prev) =>
        prev ? { ...prev, intakeStatus: 'diterima' } : null
      );
    } catch (err) {
      console.error('Failed to terima:', err);
    }
  };

  const handleDitimbang = async () => {
    if (!intake) return;
    const beratAsli = prompt(`Masukkan berat sebenarnya (kg): `, String(intake.sanggupKg));
    if (!beratAsli) return;

    try {
      await api.post(`/penerimaan/${intake.id}/ditimbang`, {
        beratAsliKg: parseFloat(beratAsli),
        catatan: `Ditimbang: ${beratAsli} kg`,
      });
      setIntake((prev) =>
        prev
          ? { ...prev, intakeStatus: 'ditimbang', beratAsliKg: parseFloat(beratAsli) }
          : null
      );
    } catch (err) {
      console.error('Failed to ditimbang:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (error || !intake) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => navigate('/penerimaan/intake-petani')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{error || 'Data tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  const statusColor = {
    menunggu_penerimaan: 'text-yellow-600',
    diterima: 'text-blue-600',
    ditimbang: 'text-purple-600',
    selesai: 'text-green-600',
  };

  const statusBg = {
    menunggu_penerimaan: 'bg-yellow-50',
    diterima: 'bg-blue-50',
    ditimbang: 'bg-purple-50',
    selesai: 'bg-green-50',
  };

  const statusLabel = {
    menunggu_penerimaan: 'Menunggu Penerimaan',
    diterima: 'Diterima',
    ditimbang: 'Sudah Ditimbang',
    selesai: 'Selesai',
  };

  const isCompleted = intake.intakeStatus === 'selesai';
  const canTerima = intake.intakeStatus === 'menunggu_penerimaan';
  const canDitimbang =
    intake.intakeStatus === 'diterima' ||
    intake.intakeStatus === 'ditimbang';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/penerimaan/intake-petani')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </button>
        <span className={`px-4 py-2 rounded-lg font-medium text-sm ${statusColor[intake.intakeStatus]} ${statusBg[intake.intakeStatus]}`}>
          {statusLabel[intake.intakeStatus]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left Column - Main Info */}
        <div className="space-y-5">
          {/* Nomor Penerimaan */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs text-slate-400 font-medium mb-2">Nomor Penerimaan</p>
            <p className="text-lg font-mono font-bold text-slate-800">{intake.nomorPenerimaan}</p>
          </div>

          {/* Petani Info */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-slate-400 font-medium">Informasi Petani</p>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">{intake.petaniNama}</p>
                <p className="text-xs text-slate-500">ID: {intake.petaniId}</p>
              </div>
            </div>
          </div>

          {/* Komoditas Info */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-slate-400 font-medium">Komoditas</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Nama</span>
                <span className="font-medium text-slate-700">{intake.komoditasNama}</span>
              </div>
              {intake.kodeKomoditasGlobal && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Kode</span>
                  <span className="font-mono text-sm font-medium text-slate-700">
                    {intake.kodeKomoditasGlobal}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Komitmen</span>
                <span className="font-medium text-slate-700">{intake.sanggupKg} kg</span>
              </div>
              {intake.estimasiTanggalPanen && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Est. Panen</span>
                  <span className="text-sm text-slate-700">{intake.estimasiTanggalPanen}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline & Actions */}
        <div className="space-y-5">
          {/* Timeline */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs text-slate-400 font-medium mb-4">Timeline Penerimaan</p>
            <div className="space-y-4">
              {/* Step 1: Terima */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      intake.intakeStatus === 'menunggu_penerimaan' ||
                      intake.intakeStatus === 'diterima' ||
                      intake.intakeStatus === 'ditimbang' ||
                      intake.intakeStatus === 'selesai'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {intake.intakeStatus === 'menunggu_penerimaan'
                      ? '...'
                      : <Check className="w-5 h-5" />}
                  </div>
                  {intake.intakeStatus !== 'selesai' && (
                    <div className="w-0.5 h-8 bg-slate-200"></div>
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-slate-700">Terima Barang</p>
                  {intake.terimaAt ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(intake.terimaAt).toLocaleString('id-ID')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                      {intake.intakeStatus === 'menunggu_penerimaan'
                        ? 'Menunggu penerimaan barang'
                        : 'Belum diterima'}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Timbang */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      intake.intakeStatus === 'ditimbang' ||
                      intake.intakeStatus === 'selesai'
                        ? 'bg-purple-100 text-purple-600'
                        : intake.intakeStatus === 'diterima'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {intake.intakeStatus === 'ditimbang' ||
                    intake.intakeStatus === 'selesai' ? (
                      <Check className="w-5 h-5" />
                    ) : intake.intakeStatus === 'diterima' ? (
                      '...'
                    ) : (
                      <Scale className="w-5 h-5" />
                    )}
                  </div>
                  {intake.intakeStatus !== 'selesai' && (
                    <div className="w-0.5 h-8 bg-slate-200"></div>
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-slate-700">Penimbangan</p>
                  {intake.ditimbangAt && intake.beratAsliKg ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {intake.beratAsliKg} kg •{' '}
                      {new Date(intake.ditimbangAt).toLocaleString('id-ID')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                      {intake.intakeStatus === 'diterima'
                        ? 'Siap untuk ditimbang'
                        : 'Menunggu penimbangan'}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Bukti Pembayaran */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      intake.intakeStatus === 'selesai'
                        ? 'bg-green-100 text-green-600'
                        : intake.intakeStatus === 'ditimbang' && intake.buktiPembayaranUrl
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {intake.intakeStatus === 'selesai' ||
                    (intake.intakeStatus === 'ditimbang' &&
                      intake.buktiPembayaranUrl) ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <FileCheck className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-slate-700">
                    Bukti Pembayaran
                  </p>
                  {intake.buktiPembayaranUrl ? (
                    <a
                      href={intake.buktiPembayaranUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                    >
                      Lihat Bukti →
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                      Menunggu upload bukti pembayaran
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-slate-400 font-medium mb-2">Aksi</p>
            {canTerima && (
              <button
                onClick={handleTerima}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Terima Barang
              </button>
            )}
            {canDitimbang && (
              <button
                onClick={handleDitimbang}
                className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Scale className="w-4 h-4" />
                Catat Penimbangan
              </button>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 justify-center text-green-600 font-medium text-sm">
                <Check className="w-5 h-5" />
                Intake Selesai
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
            <p>
              Dibuat:{' '}
              {new Date(intake.createdAt).toLocaleString('id-ID')}
            </p>
            {intake.catatan && <p>Catatan: {intake.catatan}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakePetaniDetailPage;
