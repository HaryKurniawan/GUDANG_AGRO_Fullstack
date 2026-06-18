import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  LogOut,
  Warehouse,
  Database,
  Truck,
  Wheat,
  ChevronDown,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.peran === 'ADMIN_GUDANG' || user?.peran === 'SUPER_ADMIN';
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const staffMenuItems = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Penerimaan',
      icon: <Truck className="w-5 h-5" />,
      submenu: [
        { path: '/kepala-gudang/penerimaan', name: 'Dashboard' },
        { path: '/kepala-gudang/harga-penerimaan', name: 'Harga Penerimaan' },
        { path: '/kepala-gudang/penerimaan/daftar', name: 'Riwayat Penerimaan' },
        { path: '/kepala-gudang/penerimaan/intake-petani', name: 'Intake Petani' },
        { path: '/kepala-gudang/penyusutan-komoditas', name: 'Penyusutan Komoditas' },
      ]
    },
    {
      path: '/kepala-gudang/stok',
      name: 'Kelola Stok',
      icon: <Warehouse className="w-5 h-5" />,
      description: 'Manajemen stok produk',
    },
    {
      name: 'Penjualan',
      icon: <ShoppingCart className="w-5 h-5" />,
      submenu: [
        { path: '/kepala-gudang/penjualan', name: 'Dashboard' },
        { path: '/kepala-gudang/penjualan/produk', name: 'Katalog B2B' },
        { path: '/kepala-gudang/penjualan/hpp', name: 'Pengaturan HPP' },
        { path: '/kepala-gudang/penjualan/seller', name: 'Daftar Seller' },
      ]
    },
    {
      name: 'Pengajuan Stok',
      icon: <ClipboardList className="w-5 h-5" />,
      submenu: [
        { path: '/kepala-gudang/pengajuan', name: 'Aktif' },
        { path: '/kepala-gudang/pengajuan/riwayat', name: 'Riwayat' },
      ]},
    {
      name: 'Permintaan Pengadaan',
      icon: <Wheat className="w-5 h-5" />,
      submenu: [
        { path: '/kepala-gudang/ajukan-kebutuhan', name: 'Pengajuan Baru' },
        { path: '/kepala-gudang/daftar-permintaan', name: 'Riwayat Permintaan' },
      ]
    },
    {
      name: 'Pemrosesan',
      icon: <Settings className="w-5 h-5" />,
      submenu: [
        { path: '/kepala-gudang/pemrosesan', name: 'Ringkasan' },
        { path: '/kepala-gudang/pemrosesan/tren-toko', name: 'Tren Pasar E-Commerce' },
        { path: '/kepala-gudang/pemrosesan/jadwal-produksi', name: 'Jadwal Produksi' },
        { path: '/kepala-gudang/pemrosesan/sortir', name: 'Sortir' },
        { path: '/kepala-gudang/pemrosesan/grading', name: 'Grading' },
        { path: '/kepala-gudang/pemrosesan/pengemasan', name: 'Pengemasan' },
      ]
    },
    {
      path: '/kepala-gudang/profil',
      name: 'Pengaturan Gudang',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const adminMenuItems = [
    {
      path: '/admin/gudang',
      name: 'Manajemen Gudang',
      icon: <Warehouse className="w-5 h-5" />,
      description: 'Kelola semua gudang',
    },
    {
      path: '/admin/master-komoditas',
      name: 'Master Komoditas',
      icon: <Database className="w-5 h-5" />,
      description: 'Kelola daftar komoditas',
    },
  ];

  const menuItems = isAdmin ? adminMenuItems : staffMenuItems;

  return (
    <aside className="w-64 bg-emerald-600 border-r border-emerald-700 flex flex-col justify-between h-screen sticky top-0 shadow-lg">
      <div>
        {/* Brand/Logo Area */}
        <div className="p-6 border-b border-emerald-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <Warehouse className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-sm">AGRO JABAR</h1>
            <p className="text-xs text-emerald-100 font-medium tracking-wider">GUDANG</p>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="p-4 mx-4 my-6 bg-emerald-700/40 rounded-2xl border border-emerald-600/50 flex flex-col">
          <span className="text-xs text-emerald-100 font-medium">Akun Aktif</span>
          <span className="font-semibold text-white truncate text-sm mt-0.5">{user?.nama || 'Admin Gudang'}</span>
          <span className="text-[10px] text-white font-semibold bg-emerald-800/60 px-2 py-0.5 rounded-md mt-2 self-start uppercase tracking-wider">
            {user?.peran === 'SUPER_ADMIN' ? 'Super Admin' : user?.peran === 'ADMIN_GUDANG' ? 'Admin' : 'Staf'}
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item: any) => {
            const isActive = item.submenu 
              ? item.submenu.some((sub: any) => location.pathname.startsWith(sub.path))
              : location.pathname.startsWith(item.path);
            const isExpanded = expandedMenus.has(item.name);

            if (item.submenu) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-white text-emerald-600 border-l-4 border-white pl-3 shadow-md'
                        : 'text-emerald-100 hover:text-white hover:bg-emerald-700/50 pl-4'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-1 border-l-2 border-emerald-700/30 pl-3 my-1">
                      {item.submenu.map((sub: any) => {
                        const isSubActive = location.pathname.startsWith(sub.path);
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                              isSubActive
                                ? 'bg-emerald-700/30 text-white'
                                : 'text-emerald-100 hover:text-white hover:bg-emerald-700/20'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-white text-emerald-600 border-l-4 border-white pl-3 shadow-md'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-700/50 pl-4'
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-white/20 text-white rounded font-bold uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-emerald-700/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-emerald-100 hover:text-white hover:bg-red-500/20 rounded-xl text-sm font-medium transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
