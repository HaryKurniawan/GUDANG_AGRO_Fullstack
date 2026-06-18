import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Warehouse,
  Truck,
  Package,
  Store,
  ChevronDown,
  LogOut,
  User,
  Settings2,
  Shield,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { SSEEvent } from '../../hooks/useSSE';

/**
 * TOPBAR — Gudang
 *
 * Setiap role punya tab navigasi sendiri berdasarkan prefix path:
 * - ADMIN_GUDANG → /kepala-gudang/...
 * - STAF_GUDANG  → /staf/...
 * - SUPER_ADMIN  → /admin/...
 */

interface TopbarProps {
  notifications: SSEEvent[];
  unreadCount: number;
  markAsRead: () => void;
  clearNotifications: () => void;
}

type Peran = 'SUPER_ADMIN' | 'ADMIN_GUDANG' | 'STAF_GUDANG';

// ═══════════════════════════════════════════════════════
// Tab definitions per role
// ═══════════════════════════════════════════════════════

interface TabDef {
  label: string;
  icon: typeof Truck;
  path: string;
}

function getTabsForRole(role: Peran): TabDef[] {
  switch (role) {
    case 'ADMIN_GUDANG':
      return [
        { label: 'Pemrosesan',   icon: Package,  path: '/kepala-gudang' },
        { label: 'Penerimaan',   icon: Truck,    path: '/kepala-gudang/penerimaan' },
        { label: 'Penjualan',    icon: Store,    path: '/kepala-gudang/penjualan' },
      ];
    case 'STAF_GUDANG':
      return [
        { label: 'Pemrosesan',   icon: Package,  path: '/staf' },
        { label: 'Penerimaan',   icon: Truck,    path: '/staf/penerimaan' },
        { label: 'Penjualan',    icon: Store,    path: '/staf/penjualan' },
      ];
    case 'SUPER_ADMIN':
      return [
        { label: 'Dashboard',    icon: Settings2, path: '/admin' },
        { label: 'Penerimaan',   icon: Truck,     path: '/admin/penerimaan' },
        { label: 'Pemrosesan',   icon: Package,   path: '/admin/pemrosesan' },
        { label: 'Penjualan',    icon: Store,     path: '/admin/penjualan' },
      ];
    default:
      return [];
  }
}

export function getActiveSection(pathname: string): string {
  // Kepala Gudang sections
  if (pathname.startsWith('/kepala-gudang/penerimaan') || pathname.startsWith('/kepala-gudang/ajukan-kebutuhan') || pathname.startsWith('/kepala-gudang/riwayat-pengajuan') || pathname.startsWith('/kepala-gudang/kepala-petani') || pathname.startsWith('/kepala-gudang/harga-penerimaan')) return '/kepala-gudang/penerimaan';
  if (pathname.startsWith('/kepala-gudang/penjualan') || pathname.startsWith('/kepala-gudang/pengajuan')) return '/kepala-gudang/penjualan';
  if (pathname.startsWith('/kepala-gudang')) return '/kepala-gudang'; // default = pemrosesan

  // Staf sections
  if (pathname.startsWith('/staf/penerimaan')) return '/staf/penerimaan';
  if (pathname.startsWith('/staf/penjualan') || pathname.startsWith('/staf/pengajuan') || pathname.startsWith('/staf/penjualan-keluar')) return '/staf/penjualan';
  if (pathname.startsWith('/staf')) return '/staf'; // pemrosesan + laporan-batch + info

  // Admin sections
  if (pathname.startsWith('/admin/penerimaan') || pathname.startsWith('/admin/kepala-petani')) return '/admin/penerimaan';
  if (pathname.startsWith('/admin/pemrosesan')) return '/admin/pemrosesan';
  if (pathname.startsWith('/admin/penjualan')) return '/admin/penjualan';
  if (pathname.startsWith('/admin')) return '/admin';

  return '/staf';
}

const Topbar: React.FC<TopbarProps> = ({ notifications: _n, unreadCount: _u, markAsRead: _m, clearNotifications: _c }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);

  const [showProfile, setShowProfile] = useState(false);

  const userRole = (user?.peran as Peran) || 'STAF_GUDANG';
  const activeSection = getActiveSection(location.pathname);
  const tabs = getTabsForRole(userRole);

  const getRoleConfig = () => {
    const roleConfigs: {
      [key: string]: {
        icon: React.ReactNode;
        label: string;
        bgColor: string;
        textColor: string;
      };
    } = {
      SUPER_ADMIN: {
        icon: <Shield size={16} className="text-orange-600" />,
        label: 'Super Admin',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-600',
      },
      ADMIN_GUDANG: {
        icon: <Users size={16} className="text-purple-600" />,
        label: 'Kepala Gudang',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-600',
      },
      STAF_GUDANG: {
        icon: <Wrench size={16} className="text-blue-600" />,
        label: 'Staf Operasional',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
      },
    };

    const roleKey = user?.peran || '';
    return roleConfigs[roleKey] || {
      icon: <User size={16} className="text-gray-600" />,
      label: user?.peran || 'User',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
    };
  };

  const roleConfig = getRoleConfig();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.nama || 'Admin Gudang';

  return (
    <header className="w-full h-14 bg-white rounded-2xl px-4 flex items-center gap-4 flex-shrink-0">

      {/* ── Logo + Nama Gudang ── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-sm shadow-emerald-200">
          <Warehouse size={16} className="text-white" />
        </div>
        {/* Nama gudang di samping logo */}
        {userRole !== 'SUPER_ADMIN' && user?.managedWarehouses?.[0] && (
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold text-gray-800 leading-tight truncate max-w-[140px]">
              {user.managedWarehouses[0].nama}
            </span>
            <span className="text-[9px] text-gray-400 font-medium">
              {user.managedWarehouses[0].kode}
            </span>
          </div>
        )}
        {userRole === 'SUPER_ADMIN' && (
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold text-gray-800 leading-tight">Agro Jabar</span>
            <span className="text-[9px] text-orange-400 font-medium">Super Admin</span>
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-gray-200 flex-shrink-0" />

      {/* ── Tab Section ── */}
      <nav className="flex items-center gap-1.5 flex-1">
        {tabs.map((tab) => {
          const active = activeSection === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150 border whitespace-nowrap ${
                active
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Avatar ── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-all"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[12px] font-medium text-gray-700 leading-tight">{displayName}</span>
              <span className="text-[10px] text-gray-400">{roleConfig.label}</span>
            </div>
            <div className={`w-8 h-8 rounded-full ${roleConfig.bgColor} border flex items-center justify-center flex-shrink-0`}>
              {roleConfig.icon}
            </div>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
          </button>

          {showProfile && (
            <>
              <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-50">
                <div className={`px-3 py-3 border-b border-gray-100 mb-1.5 ${roleConfig.bgColor} rounded-lg`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${roleConfig.bgColor} border flex items-center justify-center flex-shrink-0`}>
                      {roleConfig.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-semibold ${roleConfig.textColor} uppercase tracking-wide`}>Role</p>
                      <p className="text-[12px] font-bold text-gray-900">{roleConfig.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{user?.email || ''}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 text-[12px] font-medium transition-all"
                >
                  <LogOut size={14} />
                  Keluar Sesi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
