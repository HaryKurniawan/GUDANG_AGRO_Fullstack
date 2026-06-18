import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Package,
  ShoppingCart,
  Leaf,
  Users,
  TrendingUp,
  Boxes,
  Settings2,
  LogOut,
  ChevronDown,
  Building2,
  Database,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

/**
 * GUDANG SIDEBAR — Mockup Style
 *
 * Satu sidebar dark (bg-slate-900) di kiri, semua menu langsung terlihat.
 * Role-based: menu berbeda berdasarkan peran user.
 * Styling mengikuti mockup: dark theme, emerald accent, compact.
 */

type Peran = 'SUPER_ADMIN' | 'ADMIN_GUDANG' | 'STAF_GUDANG';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { path: string; label: string }[];
  roles: Peran[];
}

const MENU_ITEMS: MenuItem[] = [
  // ── Pemrosesan & Dashboard ────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/kepala-gudang',
    roles: ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'],
  },
  // ── Penerimaan ────────────────────────────────────────
  {
    id: 'penerimaan',
    label: 'Penerimaan Bahan',
    icon: Truck,
    roles: ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'],
    children: [
      { path: '/kepala-gudang/penerimaan/daftar', label: 'Daftar Penerimaan' },
      { path: '/kepala-gudang/penerimaan/intake-petani', label: 'Penerimaan dari Petani' },
      { path: '/kepala-gudang/harga-penerimaan', label: 'Harga Penerimaan' },
      { path: '/kepala-gudang/penyusutan-komoditas', label: 'Penyusutan Komoditas' },
    ],
  },
  // ── Pengadaan ──────────────────────────────────────────
  {
    id: 'pengadaan',
    label: 'Kebutuhan & Order Tani',
    icon: Leaf,
    roles: ['ADMIN_GUDANG', 'SUPER_ADMIN'],
    children: [
      { path: '/kepala-gudang/ajukan-kebutuhan', label: 'Ajukan Kebutuhan' },
      { path: '/kepala-gudang/daftar-permintaan', label: 'Riwayat Permintaan' },
    ],
  },
  // ── Pemrosesan / Produksi ──────────────────────────────
  {
    id: 'produksi',
    label: 'Proses Produksi',
    icon: Package,
    roles: ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'],
    children: [
      { path: '/kepala-gudang/pemrosesan/jadwal-produksi', label: 'Jadwal Produksi' },
      { path: '/kepala-gudang/pemrosesan/sortir', label: 'Sortir & Cuci' },
      { path: '/kepala-gudang/pemrosesan/grading', label: 'Cutting' },
      { path: '/kepala-gudang/pemrosesan/pengemasan', label: 'Pengemasan' },
      { path: '/kepala-gudang/pemrosesan/laporan-batch', label: 'Laporan Batch' },
    ],
  },
  // ── HPP ────────────────────────────────────────────────
  {
    id: 'hpp-pengaturan',
    label: 'HPP Pengaturan',
    icon: TrendingUp,
    path: '/kepala-gudang/penjualan/hpp',
    roles: ['ADMIN_GUDANG', 'SUPER_ADMIN'],
  },
  {
    id: 'hpp-laporan',
    label: 'HPP Laporan Margin',
    icon: TrendingUp,
    path: '/kepala-gudang/penjualan/laporan-hpp',
    roles: ['ADMIN_GUDANG', 'SUPER_ADMIN'],
  },
  // ── Stok ───────────────────────────────────────────────
  {
    id: 'stok',
    label: 'Stok Gudang',
    icon: Boxes,
    path: '/kepala-gudang/stok',
    roles: ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'],
  },
  // ── Penjualan / Pengajuan Seller ───────────────────────
  {
    id: 'penjualan',
    label: 'Penjualan & Pengiriman',
    icon: ShoppingCart,
    roles: ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'],
    children: [
      { path: '/kepala-gudang/penjualan', label: 'Ringkasan' },
      { path: '/kepala-gudang/pengajuan', label: 'Pengajuan Aktif' },
      { path: '/kepala-gudang/pengajuan/riwayat', label: 'Riwayat Pengajuan' },
      { path: '/kepala-gudang/penjualan/produk', label: 'Produk yang Dijual' },
      { path: '/kepala-gudang/penjualan/seller', label: 'Daftar Seller' },
      { path: '/kepala-gudang/penjualan/tren', label: 'Tren Produk Laku' },
      { path: '/kepala-gudang/pemrosesan/tren-toko', label: 'Tren Pasar E-Commerce' },
    ],
  },
  // ── Kepala Petani ──────────────────────────────────────
  {
    id: 'petani',
    label: 'Kepala Petani',
    icon: Users,
    path: '/kepala-gudang/kepala-petani',
    roles: ['ADMIN_GUDANG', 'SUPER_ADMIN'],
  },
  // ── Komoditas ──────────────────────────────────────────
  {
    id: 'komoditas',
    label: 'Master Komoditas',
    icon: Database,
    path: '/kepala-gudang/komoditas',
    roles: ['ADMIN_GUDANG', 'SUPER_ADMIN'],
  },
  // ── Profil Gudang ──────────────────────────────────────
  {
    id: 'profil',
    label: 'Pengaturan Gudang',
    icon: Building2,
    path: '/kepala-gudang/profil',
    roles: ['ADMIN_GUDANG', 'SUPER_ADMIN'],
  },
];

// Super Admin additional items
const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Dashboard Admin',
    icon: LayoutDashboard,
    path: '/admin',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'admin-master',
    label: 'Master Data',
    icon: Settings2,
    roles: ['SUPER_ADMIN'],
    children: [
      { path: '/admin/master-komoditas', label: 'Master Komoditas' },
      { path: '/admin/master-varian', label: 'Master Varian' },
      { path: '/admin/gudang', label: 'Data Gudang' },
      { path: '/admin/afiliasi', label: 'Afiliasi' },
    ],
  },
];

const GudangSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const userRole = (user?.peran as Peran) || 'STAF_GUDANG';
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand menu containing active path
    const active = new Set<string>();
    const allMenus = userRole === 'SUPER_ADMIN' ? [...ADMIN_MENU_ITEMS, ...MENU_ITEMS] : MENU_ITEMS;
    allMenus.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
        active.add(item.id);
      }
    });
    return active;
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN_GUDANG': return 'Kepala Gudang';
      case 'STAF_GUDANG': return 'Staf Operasional';
      default: return 'User';
    }
  };

  // Build menu based on role
  let menuItems: MenuItem[];
  if (userRole === 'SUPER_ADMIN') {
    menuItems = [...ADMIN_MENU_ITEMS, ...MENU_ITEMS.filter((m) => m.roles.includes('SUPER_ADMIN'))];
  } else if (userRole === 'STAF_GUDANG') {
    // Staf uses /staf/ prefix — remap paths
    menuItems = MENU_ITEMS
      .filter((m) => m.roles.includes('STAF_GUDANG'))
      .map((item) => ({
        ...item,
        path: item.path?.replace('/kepala-gudang', '/staf'),
        children: item.children?.map((c) => ({
          ...c,
          path: c.path.replace('/kepala-gudang', '/staf'),
        })),
      }));
  } else {
    menuItems = MENU_ITEMS.filter((m) => m.roles.includes(userRole));
  }

  return (
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0 select-none border-r border-slate-800/50">
      {/* ── Branding Header ────────────────────────────────── */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
          AG
        </div>
        <span className="text-white font-semibold tracking-tight text-base">
          Agro Gudang
        </span>
      </div>

      {/* ── User Session Card ──────────────────────────────── */}
      <div className="px-4 mb-4">
        <div className="p-4 rounded-xl border border-slate-800/40 bg-slate-800/30">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">
            User Session
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              {(user?.nama || 'U').charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-none">
                {user?.nama || 'Admin Gudang'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-mono truncate">
                {getRoleLabel()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">
          MENU PANEL
        </div>

        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = expanded.has(item.id);
          const itemActive = item.path ? isActive(item.path) : item.children?.some((c) => isActive(c.path));

          if (hasChildren) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    itemActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent size={18} className={itemActive ? 'text-emerald-400' : 'text-slate-400'} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${itemActive ? 'text-emerald-400' : 'text-slate-500'}`}
                  />
                </button>

                {isOpen && (
                  <div className="ml-7 mt-1 space-y-0.5 border-l border-slate-700/50 pl-3">
                    {item.children!.map((child) => {
                      const childActive = isActive(child.path);
                      return (
                        <button
                          key={child.path}
                          onClick={() => handleNavigate(child.path)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all ${
                            childActive
                              ? 'text-emerald-400 font-semibold bg-emerald-500/5'
                              : 'text-slate-500 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Plain item
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path || '')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                itemActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <IconComponent size={18} className={itemActive ? 'text-emerald-400' : 'text-slate-400'} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer Logout ──────────────────────────────────── */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
        >
          <LogOut size={13} />
          <span>Keluar Sesi</span>
        </button>
        <p className="text-center text-[9px] font-mono text-slate-600 mt-3">
          Gudang WMS v1.0 • Agro Jabar
        </p>
      </div>
    </aside>
  );
};

export default GudangSidebar;
