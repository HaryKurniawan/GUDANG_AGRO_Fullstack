import { 
  Warehouse, 
  Package, 
  ShoppingCart, 
  Truck, 
  User, 
  FileText, 
  CheckSquare, 
  Activity, 
  Scale, 
  TrendingUp,
  LayoutDashboard,
  LogOut,
  Bell,
  HardDrive
} from "lucide-react";
import { UserSession } from "../types";

interface SidebarProps {
  session: UserSession;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  unreadCount: number;
}

export default function Sidebar({ session, activeTab, setActiveTab, onLogout, unreadCount }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin Gudang", "Kepala Produksi", "Pimpinan"] },
    { id: "orders", label: "Permintaan SBU", icon: ShoppingCart, roles: ["Admin Gudang", "Pimpinan"] },
    { id: "procurements", label: "Kebutuhan & Order Tani", icon: Warehouse, roles: ["Admin Gudang", "Pimpinan"] },
    { id: "receiving", label: "Penerimaan Bahan", icon: HardDrive, roles: ["Admin Gudang", "Kepala Produksi"] },
    { id: "weighing", label: "Timbang Ulang", icon: Scale, roles: ["Admin Gudang"] },
    { id: "qc", label: "Quality Control", icon: CheckSquare, roles: ["Admin Gudang", "Kepala Produksi"] },
    { id: "production", label: "Proses Produksi", icon: Package, roles: ["Admin Gudang", "Kepala Produksi", "Pimpinan"] },
    { id: "hpp", label: "Perhitungan HPP", icon: TrendingUp, roles: ["Kepala Produksi", "Pimpinan"] },
    { id: "shipments", label: "Pengiriman SBU", icon: Truck, roles: ["Admin Gudang"] },
    { id: "audits", label: "Audit Log Sistem", icon: Activity, roles: ["Admin Gudang", "Pimpinan"] },
    { id: "docs", label: "Dokumentasi & Skripsi", icon: FileText, roles: ["Admin Gudang", "Kepala Produksi", "Pimpinan"] },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(session.role));

  return (
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0 select-none border-r border-slate-800/50">
      {/* Sleek Branding Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold select-none shadow-sm shadow-emerald-500/20">
          AP
        </div>
        <span className="text-white font-semibold tracking-tight text-base font-display">Agro Produksi</span>
      </div>

      {/* User Session card */}
      <div className="px-4 mb-4 select-none">
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800/40">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">User Session</div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              {session.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-none">{session.fullName}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-mono truncate">{session.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3 font-display">MENU PANEL</div>
        {filteredMenu.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 font-medium border-l-2 border-emerald-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent size={18} className={isActive ? "text-emerald-400" : "text-slate-400"} />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              {item.id === "dashboard" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Log Out Area */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-805 border-slate-800 rounded-lg text-xs font-semibold text-rose-450 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
        >
          <LogOut size={13} />
          <span>Keluar Sesi</span>
        </button>
        <p className="text-center text-[9px] font-mono text-slate-600 mt-3 select-none">FZWMS v1.4.2 • PT. FZW</p>
      </div>
    </aside>
  );
}
