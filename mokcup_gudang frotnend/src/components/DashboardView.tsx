import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { 
  Activity, ShoppingCart, Target, AlertOctagon, TrendingUp, DollarSign,
  CheckCircle2, AlertCircle, Sparkles, Clock, Globe
} from "lucide-react";
import { UserSession, SystemNotification } from "../types";

interface DashboardViewProps {
  session: UserSession;
  notifications: SystemNotification[];
  onMarkNotificationsAsRead: () => void;
}

export default function DashboardView({ session, notifications, onMarkNotificationsAsRead }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard-stats");
      const data = await response.json();
      setStats(data);
    } catch (e) {
      console.error("Gagal memuat statistik dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm mt-4 font-medium animate-pulse">Memuat metrik pergudangan...</p>
      </div>
    );
  }

  // Pre-prepare chart data
  const productionData = [
    { name: "Wortel", value: stats?.breakdownCommodity?.Wortel || 0, color: "#f97316" },
    { name: "Buncis", value: stats?.breakdownCommodity?.Buncis || 0, color: "#22c55e" },
    { name: "Jagung", value: stats?.breakdownCommodity?.["Jagung Manis"] || 0, color: "#eab308" },
    { name: "S. Mix", value: stats?.breakdownCommodity?.["Sayuran Mix"] || 0, color: "#3b82f6" }
  ];

  // Dummy Reject Trend for display
  const rejectTrendData = [
    { tanggal: "24 Mei", Wortel: 0, Buncis: 0 },
    { tanggal: "25 Mei", Wortel: 15, Buncis: 0 },
    { tanggal: "26 Mei", Wortel: 0, Buncis: 45 },
    { tanggal: "27 Mei", Wortel: 0, Buncis: 12 }
  ];

  // Highlighted notifications for warning box
  const warnings = notifications.filter(n => n.type === "warn" || n.type === "error");

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-750 bg-emerald-600 p-8 rounded-2xl border border-emerald-500/10 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Globe className="w-64 h-64 text-white rotate-12" />
        </div>
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center space-x-2 text-white font-mono text-xs uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full w-fit border border-white/15">
            <Sparkles size={12} className="text-amber-300" />
            <span>Sistem Gudang Terintegrasi Smart-WMS</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-3 leading-tight">
            Selamat Bekerja, {session.fullName}!
          </h1>
          <p className="text-sm text-emerald-50 mt-2 leading-normal">
            Sistem memantau seluruh rantai pasok sayuran beku Indonesia, mulai dari pengiriman petani, proses IQF freezing, timbang ulang deviasi kualitas, penghitungan HPP presisi tinggi, hingga berita acara BAST untuk SBU Bandung.
          </p>
        </div>
      </div>

      {/* Warning Box if shortage detected/short weight */}
      {warnings.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex items-start space-x-3 text-rose-300">
          <AlertOctagon size={20} className="shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-200">PERHATIAN SISTEM: Deviasi Penyimpangan Berat/Kualitas Terdeteksi!</p>
            <ul className="text-xs list-disc pl-4 mt-1 space-y-1 text-rose-300/80">
              {warnings.map(w => (
                <li key={w.id} className="leading-normal">
                  <span className="font-semibold">{w.title}</span>: {w.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Quick operational cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium select-none">Total Order SBU</span>
            <p className="text-2.5xl font-bold text-white mt-1.5">{stats?.totalOrder || 0} Batch</p>
            <span className="text-[10px] text-emerald-400 font-sans block mt-1">● Aktif dari Bandung</span>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium select-none">Produksi Sayur Beku</span>
            <p className="text-2.5xl font-bold text-white mt-1.5">{stats?.totalProdKg?.toLocaleString("id-ID") || 0} Kg</p>
            <span className="text-[10px] text-emerald-400 font-sans block mt-1">✓ Lolos standard sterilisasi</span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-400">
            <Target size={24} />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium select-none">Komoditas Reject</span>
            <p className="text-2.5xl font-bold text-rose-400 mt-1.5">{stats?.totalRejectKg?.toLocaleString("id-ID") || 0} Kg</p>
            <span className="text-[10px] text-rose-400 font-sans block mt-1">⚠ Terdeteksi & diisolasi</span>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-lg text-rose-400">
            <AlertOctagon size={24} />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium select-none">Est. Nilai Penjualan</span>
            <p className="text-2.5xl font-bold text-emerald-300 mt-1.5">Rp {stats?.totalRevenue?.toLocaleString("id-ID") || "0"}</p>
            <span className="text-[10px] text-emerald-400 font-sans block mt-1">Est. Profit: Rp {stats?.estimatedProfit?.toLocaleString("id-ID") || 0}</span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg text-amber-400">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Yield Chart */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 col-span-1 lg:col-span-8 flex flex-col">
          <p className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Volume Hasil Cold Storage per Sayuran (Kg)</p>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                <Bar dataKey="value" name="Hasil Jadi (Kg)">
                  {productionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Share Pie */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 col-span-1 lg:col-span-4 flex flex-col justify-between">
          <p className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Porsi Stok Gudang</p>
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center select-none pointer-events-none">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Total Stok</span>
              <p className="text-lg font-bold text-white">{stats?.totalProdKg} Kg</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-slate-800">
            {productionData.map((d, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-400 font-medium">{d.name} ({d.value} kg)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Real-time Notifications log */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 lg:col-span-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Pemberitahuan Sistem</h3>
            </div>
            {notifications.length > 0 && (
              <button 
                onClick={onMarkNotificationsAsRead}
                className="text-[10px] text-emerald-400 underline font-semibold cursor-pointer hover:text-emerald-300"
              >
                Tandai Dibaca Semua
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="mx-auto text-emerald-400/40 mb-2" size={28} />
                <p className="text-xs text-slate-500">Tidak ada agenda pemberitahuan penting baru.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-lg border text-xs flex items-start space-x-3 transition-colors ${
                    notif.read ? "bg-slate-950/20 border-slate-900 text-slate-400" : "bg-slate-850 bg-slate-800/40 border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="mt-0.5">
                    {notif.type === "error" || notif.type === "warn" ? (
                      <AlertCircle className="text-amber-500" size={14} />
                    ) : (
                      <CheckCircle2 className="text-emerald-400" size={14} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold flex justify-between items-center text-slate-200">
                      <span>{notif.title}</span>
                      <span className="text-[9px] font-mono text-slate-500 font-normal">
                        {new Date(notif.timestamp).toLocaleTimeString("id", {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit trail preview */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 lg:col-span-6">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
            <Activity size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Audit Trail Aktivitas Terakhir</h3>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto font-mono">
            {stats?.recentLogs?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Belum ada aktivitas terekam.</p>
            ) : (
              stats?.recentLogs?.map((log: any) => (
                <div key={log.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-900 text-[11px] flex flex-col space-y-1 text-slate-300">
                  <div className="flex justify-between text-slate-500 text-[9px] border-b border-slate-900/60 pb-1">
                    <span>IP: {log.ipAddress}</span>
                    <span>{new Date(log.timestamp).toLocaleString("id-ID")}</span>
                  </div>
                  <p className="mt-0.5 leading-normal">
                    <span className="text-emerald-400 font-bold">[{log.role}] </span>
                    <span className="text-slate-300 font-bold">{log.username} </span>
                    <span className="text-cyan-400"> {log.action}</span>
                  </p>
                  <p className="text-slate-400 text-[10px] leading-normal">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
