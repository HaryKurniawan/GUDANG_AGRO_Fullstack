import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Filter,
  TrendingDown,
} from 'lucide-react';

interface BatchItem {
  penerimaanId: string;
  nomorPenerimaan: string;
  pemrosesanId: string | null;
  tanggal: string;
  komoditasNama: string;
  petaniNama: string;
  gudang: { id: string; nama: string; kode: string } | null;
  penerima: { id: string; nama: string } | null;
  beratMasukKg: number;
  kondisiMasuk: string;
  beratBersihKg: number;
  sortirRejectKg: number;
  sortirSelesai: boolean;
  gradeA_Kg: number;
  gradeB_Kg: number;
  gradeC_Kg: number;
  rejectKg: number;
  gradingSelesai: boolean;
  jumlahKemasan: number;
  beratPerKemasan: number | null;
  jenisKemasan: string | null;
  totalKgKemasan: number;
  kemasSelesai: boolean;
  masukStok: boolean;
  stokAkhirKg: number;
  susutKg: number;
  susutPersen: number;
  tahap: string;
  statusPenerimaan: string;
  sortirAt?: string;
  gradingAt?: string;
  kemasAt?: string;
  masukStokAt?: string;
}

interface Summary {
  totalBatch: number;
  totalBeratMasukKg: number;
  totalBeratBersihKg: number;
  totalGradeA: number;
  totalGradeB: number;
  totalGradeC: number;
  totalRejectKg: number;
  totalKemasan: number;
  totalStokAkhirKg: number;
  batchSelesai: number;
  batchDiproses: number;
  batchBelumDiproses: number;
}

const tahapLabel: Record<string, { label: string; color: string }> = {
  BELUM_DIPROSES: { label: 'Belum Diproses', color: 'bg-slate-100 text-slate-500' },
  SORTIR: { label: 'Sortir & Cuci', color: 'bg-amber-50 text-amber-600' },
  GRADING: { label: 'Grading/QC', color: 'bg-blue-50 text-blue-600' },
  PENGEMASAN: { label: 'Pengemasan', color: 'bg-purple-50 text-purple-600' },
  STOK: { label: 'Masuk Stok', color: 'bg-emerald-50 text-emerald-600' },
  SELESAI: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700' },
};

const LaporanBatchPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'selesai' | 'proses'>('semua');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/laporan/batch', { params: { limit: 100 } });
      setBatches(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = batches.filter(b => {
    const matchSearch = !search || b.komoditasNama.toLowerCase().includes(search.toLowerCase()) || b.petaniNama.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'semua' || (filterStatus === 'selesai' && b.masukStok) || (filterStatus === 'proses' && !b.masukStok);
    return matchSearch && matchStatus;
  });

  const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Laporan Batch Pemrosesan</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Riwayat setiap batch dari penerimaan petani → sortir → grading → kemasan → stok
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Total Masuk</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{fmt(summary.totalBeratMasukKg)} kg</p>
            <p className="text-[10px] text-slate-400">{summary.totalBatch} batch</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Stok Akhir</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{fmt(summary.totalStokAkhirKg)} kg</p>
            <p className="text-[10px] text-slate-400">{summary.batchSelesai} batch selesai</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Total Kemasan</p>
            <p className="text-lg font-bold text-amber-600 mt-1">{summary.totalKemasan.toLocaleString('id-ID')}</p>
            <p className="text-[10px] text-slate-400">pack dikemas</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Dalam Proses</p>
            <p className="text-lg font-bold text-blue-600 mt-1">{summary.batchDiproses}</p>
            <p className="text-[10px] text-slate-400">{summary.batchBelumDiproses} menunggu</p>
          </div>
        </div>
      )}

      {/* Grade Summary */}
      {summary && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Distribusi Grade (Semua Batch)</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[9px] text-emerald-500 font-semibold uppercase">Grade A</p>
              <p className="text-sm font-bold text-emerald-700">{fmt(summary.totalGradeA)} kg</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[9px] text-blue-500 font-semibold uppercase">Grade B</p>
              <p className="text-sm font-bold text-blue-700">{fmt(summary.totalGradeB)} kg</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[9px] text-amber-500 font-semibold uppercase">Grade C</p>
              <p className="text-sm font-bold text-amber-700">{fmt(summary.totalGradeC)} kg</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-[9px] text-red-500 font-semibold uppercase">Reject</p>
              <p className="text-sm font-bold text-red-600">{fmt(summary.totalRejectKg)} kg</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Cari komoditas / petani..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <div className="flex gap-1">
          {([
            { key: 'semua', label: 'Semua' },
            { key: 'selesai', label: 'Selesai' },
            { key: 'proses', label: 'Dalam Proses' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterStatus === f.key ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
          <Filter size={11} /> {filtered.length} batch
        </span>
      </div>

      {/* Batch List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada batch pemrosesan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(batch => {
            const isExpanded = expandedId === batch.penerimaanId;
            const tahap = tahapLabel[batch.tahap] || tahapLabel.BELUM_DIPROSES;
            const susutPct = Math.abs(batch.susutPersen);

            return (
              <div key={batch.penerimaanId} className={`bg-white border rounded-2xl overflow-hidden transition-all ${batch.masukStok ? 'border-emerald-100' : 'border-slate-100'}`}>
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : batch.penerimaanId)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${batch.masukStok ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      {batch.masukStok ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Clock size={18} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{batch.komoditasNama}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${tahap.color}`}>{tahap.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400">{batch.nomorPenerimaan}</span>
                        <span className="text-[10px] text-slate-400">Petani: {batch.petaniNama}</span>
                        <span className="text-[10px] text-slate-400">{new Date(batch.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Summary right */}
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{fmt(batch.beratMasukKg)} kg</p>
                        <p className="text-[9px] text-slate-400">masuk</p>
                      </div>
                      <div className={`text-right ${batch.stokAkhirKg > 0 ? '' : 'opacity-40'}`}>
                        <p className="text-xs font-bold text-emerald-600">{fmt(batch.stokAkhirKg)} kg</p>
                        <p className="text-[9px] text-slate-400">stok akhir</p>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-50 px-4 pb-4 space-y-3">

                    {/* Pipeline Steps */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                      {/* Sortir */}
                      <div className={`rounded-xl p-3 ${batch.sortirSelesai ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
                        <p className="text-[9px] font-semibold uppercase text-slate-400 mb-1">① Sortir & Cuci</p>
                        <p className="text-sm font-bold text-slate-700">{fmt(batch.beratBersihKg)} kg</p>
                        <p className="text-[10px] text-slate-400">bersih</p>
                        {batch.sortirRejectKg > 0 && <p className="text-[9px] text-red-500 mt-0.5">Reject: {fmt(batch.sortirRejectKg)} kg</p>}
                        {batch.sortirAt && <p className="text-[9px] text-slate-300 mt-1">{new Date(batch.sortirAt).toLocaleDateString('id-ID')}</p>}
                      </div>

                      {/* Grading */}
                      <div className={`rounded-xl p-3 ${batch.gradingSelesai ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
                        <p className="text-[9px] font-semibold uppercase text-slate-400 mb-1">② Grading/QC</p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold text-emerald-600">A: {fmt(batch.gradeA_Kg)} kg</p>
                          <p className="text-[10px] text-blue-500">B: {fmt(batch.gradeB_Kg)} kg</p>
                          <p className="text-[10px] text-amber-500">C: {fmt(batch.gradeC_Kg)} kg</p>
                          {batch.rejectKg > 0 && <p className="text-[10px] text-red-500">✗: {fmt(batch.rejectKg)} kg</p>}
                        </div>
                        {batch.gradingAt && <p className="text-[9px] text-slate-300 mt-1">{new Date(batch.gradingAt).toLocaleDateString('id-ID')}</p>}
                      </div>

                      {/* Pengemasan */}
                      <div className={`rounded-xl p-3 ${batch.kemasSelesai ? 'bg-purple-50 border border-purple-100' : 'bg-slate-50 border border-slate-100'}`}>
                        <p className="text-[9px] font-semibold uppercase text-slate-400 mb-1">③ Pengemasan</p>
                        {batch.jumlahKemasan > 0 ? (
                          <>
                            <p className="text-sm font-bold text-slate-700">{batch.jumlahKemasan.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-slate-400">pack</p>
                            {batch.beratPerKemasan && <p className="text-[9px] text-purple-500">{batch.beratPerKemasan} kg/pack</p>}
                            {batch.jenisKemasan && <p className="text-[9px] text-slate-400">{batch.jenisKemasan}</p>}
                            <p className="text-[9px] text-slate-400">{fmt(batch.totalKgKemasan)} kg total</p>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-300 italic">Belum dikemas</p>
                        )}
                        {batch.kemasAt && <p className="text-[9px] text-slate-300 mt-1">{new Date(batch.kemasAt).toLocaleDateString('id-ID')}</p>}
                      </div>

                      {/* Stok Akhir */}
                      <div className={`rounded-xl p-3 ${batch.masukStok ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100'}`}>
                        <p className="text-[9px] font-semibold uppercase text-slate-400 mb-1">④ Stok Akhir</p>
                        <p className="text-sm font-bold text-emerald-700">{fmt(batch.stokAkhirKg)} kg</p>
                        <p className="text-[10px] text-slate-400">siap stok</p>
                        {batch.masukStok && batch.masukStokAt && (
                          <p className="text-[9px] text-emerald-500 mt-1">
                            {new Date(batch.masukStokAt).toLocaleDateString('id-ID')}
                          </p>
                        )}
                        {!batch.masukStok && <p className="text-[9px] text-slate-300 italic mt-0.5">Belum masuk stok</p>}
                      </div>
                    </div>

                    {/* Susut info */}
                    {susutPct > 0 && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <TrendingDown size={13} className="text-red-500 flex-shrink-0" />
                        <p className="text-[11px] text-red-600">
                          Susut: <span className="font-bold">{fmt(batch.susutKg)} kg</span>
                          <span className="text-red-400 ml-1">({susutPct.toFixed(1)}% dari berat masuk)</span>
                        </p>
                      </div>
                    )}

                    {/* Batch info */}
                    <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400">Berat Masuk:</span>
                        <span className="font-semibold text-slate-600 ml-1">{fmt(batch.beratMasukKg)} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Kondisi:</span>
                        <span className="font-semibold text-slate-600 ml-1">{batch.kondisiMasuk}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Penerima:</span>
                        <span className="font-semibold text-slate-600 ml-1">{batch.penerima?.nama || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Gudang:</span>
                        <span className="font-semibold text-slate-600 ml-1">{batch.gudang?.nama || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LaporanBatchPage;
