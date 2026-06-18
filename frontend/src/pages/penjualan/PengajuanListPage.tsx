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
  ChevronRight
} from 'lucide-react';

const PengajuanListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = getRolePrefix(location.pathname);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DIAJUKAN' | 'PROSES' | 'SELESAI' | 'DITOLAK'>('ALL');

  const tabs = [
    { key: 'ALL', label: 'Semua Pengajuan' },
    { key: 'DIAJUKAN', label: 'Baru (Diajukan)' },
    { key: 'PROSES', label: 'Diproses / Dikirim' },
    { key: 'SELESAI', label: 'Selesai' },
    { key: 'DITOLAK', label: 'Ditolak' },
  ];

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pengajuan');
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching stock requests list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on search and tab selections
  useEffect(() => {
    let result = [...requests];

    // Status filter
    if (activeTab === 'DIAJUKAN') {
      result = result.filter((r) => r.status === 'DIAJUKAN');
    } else if (activeTab === 'PROSES') {
      result = result.filter((r) => ['DIPROSES', 'DIKIRIM'].includes(r.status));
    } else if (activeTab === 'SELESAI') {
      result = result.filter((r) => r.status === 'SELESAI');
    } else if (activeTab === 'DITOLAK') {
      result = result.filter((r) => r.status === 'DITOLAK');
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
  }, [requests, search, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            Manajemen Pengajuan Stok
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-light">
            Kelola, setujui jumlah, perbarui status logistik, dan verifikasi pengadaan barang ke mitra seller.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari ID pengajuan atau toko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all duration-300 ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50'
                : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Listing Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-2xl">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Tidak ada pengajuan yang sesuai dengan kriteria filter Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRequests.map((req) => {
            const formattedDate = new Date(req.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={req.id}
                onClick={() => navigate(`${prefix}/pengajuan/${req.id}`)}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md relative overflow-hidden"
              >
                {/* Visual glow on card hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl group-hover:bg-emerald-100 transition-all duration-500"></div>

                <div>
                  {/* Title & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono font-bold text-emerald-600 group-hover:underline">
                      #{req.id.substring(0, 8)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        req.status === 'DIAJUKAN'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : ['DIPROSES', 'DIKIRIM'].includes(req.status)
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : req.status === 'SELESAI'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Warehouse & Store Information */}
                  <div className="space-y-2 mt-4 mb-5">
                    <div className="flex items-center gap-2 text-xs">
                      <Store className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Dari:</span>
                      <span className="font-semibold text-slate-800">{req.toko.nama}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Warehouse className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Ke:</span>
                      <span className="font-medium text-slate-700">{req.gudang.nama}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {req.items.length} Item
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
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

export default PengajuanListPage;
