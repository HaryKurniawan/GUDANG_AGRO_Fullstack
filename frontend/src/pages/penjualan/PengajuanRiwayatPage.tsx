import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { getRolePrefix } from '../../lib/rolePathHelper';
import {
  ClipboardList,
  Search,
  Calendar,
  Warehouse,
  Store,
  Loader2,
  ChevronRight,
  Filter,
} from 'lucide-react';

type StatusFilter = 'ALL' | 'SELESAI' | 'DITOLAK';

const PengajuanRiwayatPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = getRolePrefix(location.pathname);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await api.get('/pengajuan');
        // Only keep completed/rejected
        const riwayat = (response.data.data || []).filter(
          (r: any) => ['SELESAI', 'DITOLAK'].includes(r.status)
        );
        setRequests(riwayat);
      } catch (error) {
        console.error('Error fetching riwayat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...requests];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter((r) => new Date(r.createdAt) >= cutoff);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.toko.nama.toLowerCase().includes(q) ||
          r.gudang.nama.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    setFilteredRequests(result);
  }, [requests, search, statusFilter, dateRange]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-600" />
          Riwayat Pengajuan Stok
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Pengajuan stok yang sudah selesai atau ditolak.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID pengajuan atau toko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['ALL', 'SELESAI', 'DITOLAK'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s === 'ALL' ? 'Semua' : s === 'SELESAI' ? 'Selesai' : 'Ditolak'}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          {([
            { value: 'all', label: 'Semua' },
            { value: '7d', label: '7 Hari' },
            { value: '30d', label: '30 Hari' },
            { value: '90d', label: '90 Hari' },
          ] as { value: typeof dateRange; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                dateRange === opt.value
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-400">
        {filteredRequests.length} riwayat {search && `dari ${requests.length}`}
      </p>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
          <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Tidak ada riwayat pengajuan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const formattedDate = new Date(req.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={req.id}
                onClick={() => navigate(`${prefix}/pengajuan/${req.id}`)}
                className="bg-white border border-slate-100 rounded-xl p-4 cursor-pointer transition-all hover:border-green-200 hover:shadow-sm group"
              >
                {/* Top */}
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-mono font-semibold text-slate-600 group-hover:text-green-600">
                    #{req.id.substring(0, 8)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      req.status === 'SELESAI'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {req.status === 'SELESAI' ? '✓ Selesai' : '✗ Ditolak'}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Store className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-slate-700 font-medium truncate">{req.toko.nama}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Warehouse className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-slate-500 truncate">{req.gudang.nama}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 text-[11px] text-slate-400">
                  <span>{formattedDate}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">{req.items.length} item</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-green-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PengajuanRiwayatPage;
