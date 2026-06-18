import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
  Loader2,
  Scissors,
  Award,
  Package,
  ArchiveRestore,
  CheckCircle2,
  ArrowRight,
  Weight,
} from 'lucide-react';

interface RingkasanStats {
  total: number;
  sortir: number;
  grading: number;
  pengemasan: number;
  stok: number;
  selesai: number;
  totalBeratMasukKg: number;
}

const PemrosesanRingkasanPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RingkasanStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/pemrosesan/ringkasan');
        setStats(res.data.data);
      } catch (error) {
        console.error('Error fetching ringkasan:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Memuat data pemrosesan...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-slate-500 text-sm">
        Gagal memuat data ringkasan.
      </div>
    );
  }

  const stages = [
    { key: 'sortir', label: 'Sortir & Cuci', count: stats.sortir, icon: Scissors, color: 'amber', path: '/pemrosesan/sortir' },
    { key: 'grading', label: 'Cutting', count: stats.grading, icon: Award, color: 'blue', path: '/pemrosesan/grading' },
    { key: 'pengemasan', label: 'Pengemasan', count: stats.pengemasan, icon: Package, color: 'purple', path: '/pemrosesan/pengemasan' },
    { key: 'stok', label: 'Siap Stok', count: stats.stok, icon: ArchiveRestore, color: 'emerald', path: '/stok' },
    { key: 'selesai', label: 'Selesai', count: stats.selesai, icon: CheckCircle2, color: 'slate', path: '' },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100 text-purple-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', iconBg: 'bg-slate-100 text-slate-600' },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-slate-50 border border-emerald-200 rounded-3xl p-6">
        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-600">
          Pipeline Pemrosesan
        </span>
        <h2 className="text-xl font-bold mt-1 text-slate-800">
          Ringkasan Pemrosesan Gudang
        </h2>
        <p className="text-xs mt-1.5 font-light leading-relaxed max-w-xl text-slate-600">
          Monitor tahapan pemrosesan barang dari penerimaan hingga masuk stok gudang.
        </p>
      </div>

      {/* Total Berat Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <Weight className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-600">Total Berat Masuk Pipeline</span>
          <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
            {stats.totalBeratMasukKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg
          </h3>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {stats.total} batch dalam proses
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-6">Alur Pemrosesan</h3>
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {stages.map((stage, idx) => {
            const colors = colorMap[stage.color];
            const Icon = stage.icon;
            return (
              <React.Fragment key={stage.key}>
                <button
                  onClick={() => stage.path && navigate(stage.path)}
                  disabled={!stage.path}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all min-w-[120px] ${
                    stage.path ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
                  } ${colors.bg} border-slate-200`}
                >
                  <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                  <span className={`text-2xl font-bold ${colors.text}`}>{stage.count}</span>
                </button>
                {idx < stages.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.slice(0, 4).map((stage) => {
          const colors = colorMap[stage.color];
          const Icon = stage.icon;
          return (
            <div
              key={stage.key}
              onClick={() => stage.path && navigate(stage.path)}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-600">{stage.label}</span>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stage.count}</h3>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {stage.count > 0 ? 'Perlu ditindaklanjuti' : 'Tidak ada antrian'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PemrosesanRingkasanPage;
