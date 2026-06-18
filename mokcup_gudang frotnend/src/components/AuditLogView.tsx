import { useState, useEffect } from "react";
import { Activity, ShieldCheck, KeyRound, RotateCcw, Search, Filter } from "lucide-react";
import { AuditLog, UserSession } from "../types";

interface AuditLogViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
}

export default function AuditLogView({ session, setErrorNotification }: AuditLogViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("SEMUA");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/audit-logs");
      const data = await response.json();
      setLogs(data);
    } catch (e) {
      setErrorNotification("Gagal melacak log keamanan audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((l) => {
    const matchesSearch = 
      l.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      selectedRoleFilter === "SEMUA" || 
      l.role.toUpperCase() === selectedRoleFilter.toUpperCase();

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Activity className="text-emerald-400" size={20} />
          <span>Audit Log Aktivitas Keamanan (FZWMS)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Buku catatan digital anti-manipulasi yang merekam semua aktivitas sistem, mutasi status, dan login pengguna.
        </p>
      </div>

      {/* Control Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 items-center">
        <div className="relative flex-1 w-full text-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktivitas, nama pegawai, sandi log..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-805 border-slate-805 border-slate-800 rounded-lg text-slate-200 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex space-x-2 w-full sm:w-auto shrink-0 justify-end text-xs">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-800 text-slate-350 text-slate-300 rounded-lg outline-none cursor-pointer font-medium"
          >
            <option value="SEMUA">Semua Role</option>
            <option value="ADMIN GUDANG">Admin Gudang</option>
            <option value="KEPALA PRODUKSI">Ka. Produksi</option>
            <option value="PIMPINAN">Pimpinan</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 px-3 bg-slate-955 border border-slate-800 hover:border-emerald-550/20 text-emerald-400 font-semibold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <RotateCcw size={12} />
            <span>Penyegaran</span>
          </button>
        </div>
      </div>

      {/* AUDIT TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden font-mono text-[11px]">
        <div className="p-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between font-sans">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Antarmuka Rekam Jejak Audit Internal</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">
            Total {filteredLogs.length} Entri Jejak
          </span>
        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-500">Membaca kernel audit log...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-8 text-center text-slate-500 font-sans italic text-xs">Belum ada aktivitas terekam sesuai kunci pencarian.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-955 text-slate-500 uppercase tracking-wider border-b border-slate-800 text-[9px] select-none">
                <tr>
                  <th className="p-4">ID Transaksi</th>
                  <th className="p-4">Tanggal & Jam Server</th>
                  <th className="p-4">Pegawai / User</th>
                  <th className="p-4">Jabatan (RBAC)</th>
                  <th className="p-4 text-emerald-400">Keyword Aksi</th>
                  <th className="p-4">IP Terminal</th>
                  <th className="p-4">Catatan Enkripsi Parameter Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 divide-slate-800/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="p-4 font-bold text-slate-500">{log.id}</td>
                    <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString("id-ID")}</td>
                    <td className="p-4 font-bold text-slate-300">{log.username}</td>
                    <td className="p-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.role === "Admin Gudang" 
                          ? "bg-slate-800 text-slate-400" 
                          : log.role === "Kepala Produksi" 
                          ? "bg-blue-950/40 text-blue-400" 
                          : "bg-purple-950/40 text-purple-400"
                      }`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-400">{log.action}</td>
                    <td className="p-4 text-slate-500">{log.ipAddress}</td>
                    <td className="p-4 text-slate-400 leading-normal max-w-sm shrink-0 whitespace-pre-wrap">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-start space-x-3 text-emerald-400">
        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 leading-normal font-sans text-slate-400">
          <p className="font-bold text-emerald-300">Penelitian Skripsi Sistem Informasi (Informasi Relasional):</p>
          <p>
            Tabel rekam audit di atas terisi secara real-time pada database <code>server-db.json</code> di Express backend setiap kali pengguna melakukan REST request. Enkripsi password SHA256 mengawal validitas keabsahan seluruh payload.
          </p>
        </div>
      </div>
    </div>
  );
}
