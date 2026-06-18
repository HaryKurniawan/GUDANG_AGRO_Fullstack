import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout components
import MainLayout from './components/layout/MainLayout';

// Pages — Shared
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/shared/DashboardPage';
import ProdukCatalogPage from './pages/shared/ProdukCatalogPage';
import StokManagementPage from './pages/shared/StokManagementPage';
import ProdukSellerPage from './pages/shared/ProdukSellerPage';
import ProfilGudangPage from './pages/shared/ProfilGudangPage';

// Pages — Penerimaan (ADMIN_GUDANG domain)
import PenerimaanDashboardPage from './pages/penerimaan/PenerimaanDashboardPage';
import PenerimaanListPage from './pages/penerimaan/PenerimaanListPage';
import GradingPage from './pages/penerimaan/GradingPage';
import PermintaanPengadaanPage from './pages/penerimaan/PermintaanPengadaanPage';
import DaftarPermintaanPage from './pages/penerimaan/DaftarPermintaanPage';
import PenerimaanKepalaPetaniListPage from './pages/penerimaan/PenerimaanKepalaPetaniListPage';
import PenerimaanKepalaPetaniDetailPage from './pages/penerimaan/PenerimaanKepalaPetaniDetailPage';
import IntakePetaniPage from './pages/penerimaan/IntakePetaniPage';
import IntakePetaniDetailPage from './pages/penerimaan/IntakePetaniDetailPage';
import HargaPenerimaanPage from './pages/penerimaan/HargaPenerimaanPage';
import PenyusutanKomoditasPage from './pages/penerimaan/PenyusutanKomoditasPage';

// Pages — Pemrosesan (STAF_GUDANG domain)
import PemrosesanRingkasanPage from './pages/pemrosesan/PemrosesanRingkasanPage';
import PemrosesanSortirPage from './pages/pemrosesan/PemrosesanSortirPage';
import PemrosesanGradingPage from './pages/pemrosesan/PemrosesanGradingPage';
import PemrosesanPengemasanPage from './pages/pemrosesan/PemrosesanPengemasanPage';
import LaporanBatchPage from './pages/pemrosesan/LaporanBatchPage';
import StafInfoPage from './pages/pemrosesan/StafInfoPage';
import JadwalProduksiPage from './pages/pemrosesan/JadwalProduksiPage';
import BuatJadwalPage from './pages/pemrosesan/BuatJadwalPage';
import DetailJadwalPage from './pages/pemrosesan/DetailJadwalPage';
import TrenTokoLanggananPage from './pages/pemrosesan/TrenTokoLanggananPage';

// Pages — Penjualan
import PenjualanDashboardPage from './pages/penjualan/PenjualanDashboardPage';
import PenjualanSellerListPage from './pages/penjualan/PenjualanSellerListPage';
import PenjualanSellerDetailPage from './pages/penjualan/PenjualanSellerDetailPage';
import PengajuanListPage from './pages/penjualan/PengajuanListPage';
import PengajuanDetailPage from './pages/penjualan/PengajuanDetailPage';
import PengajuanRiwayatPage from './pages/penjualan/PengajuanRiwayatPage';
import BarangKeluarPage from './pages/penjualan/BarangKeluarPage';
import TrenPenjualanPage from './pages/penjualan/TrenPenjualanPage';
import HppPengaturanPage from './pages/penjualan/HppPengaturanPage';
import LaporanHppPage from './pages/penjualan/LaporanHppPage';
import ProdukJualPage from './pages/penjualan/ProdukJualPage';

// Pages — Kepala Gudang (read-only views)
import KomoditasReadOnlyPage from './pages/kepala-gudang/KomoditasReadOnlyPage';

// Pages — Admin (SUPER_ADMIN domain)
import GudangListPage from './pages/admin/GudangListPage';
import GudangBaruPage from './pages/admin/GudangBaruPage';
import KepalGudangBaruPage from './pages/admin/KepalGudangBaruPage';
import MasterKomoditasPage from './pages/admin/MasterKomoditasPage';
import MasterVarianPage from './pages/admin/MasterVarianPage';
import AfiliasiManagePage from './pages/admin/AfiliasiManagePage';

// ─── Role Types ────────────────────────────────────────────────────────────
type Peran = 'SUPER_ADMIN' | 'ADMIN_GUDANG' | 'STAF_GUDANG';

// ─── Protected Route: Requires Authentication ──────────────────────────────
const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// ─── Role-Based Route Guard ────────────────────────────────────────────────
const RoleRoute: React.FC<{ allowedRoles: Peran[] }> = ({ allowedRoles }) => {
  const user = useAuthStore((state) => state.user);
  const userRole = (user?.peran as Peran) || 'STAF_GUDANG';

  if (allowedRoles.includes(userRole)) {
    return <Outlet />;
  }

  return <Navigate to={getRoleHomePage(userRole)} replace />;
};

// ─── Get Home Page by Role ─────────────────────────────────────────────────
function getRoleHomePage(role: Peran): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'ADMIN_GUDANG':
      return '/kepala-gudang';
    case 'STAF_GUDANG':
      return '/staf';
    default:
      return '/staf';
  }
}

// ─── Smart Home Redirect (after login) ─────────────────────────────────────
const HomeRedirect = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = (user?.peran as Peran) || 'STAF_GUDANG';
  return <Navigate to={getRoleHomePage(userRole)} replace />;
};

const App: React.FC = () => {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public Routes ─── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/produk-seller" element={<ProdukSellerPage />} />

        {/* ─── Authenticated Routes ─── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Smart home redirect based on role */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/dashboard" element={<HomeRedirect />} />

            {/* ══════════════════════════════════════════════════════════
                KEPALA GUDANG (ADMIN_GUDANG) Section
                - Penerimaan: Ajukan kebutuhan, lihat daftar penerimaan
                - Kepala Petani: Lihat petani terafiliasi
                - Pemrosesan: Monitor (read-only)
                - Komoditas: Lihat komoditas utama
               ══════════════════════════════════════════════════════════ */}
            <Route element={<RoleRoute allowedRoles={['ADMIN_GUDANG', 'SUPER_ADMIN']} />}>
              <Route path="/kepala-gudang" element={<PemrosesanRingkasanPage />} />
              <Route path="/kepala-gudang/penerimaan" element={<PenerimaanDashboardPage />} />
              <Route path="/kepala-gudang/penerimaan/daftar" element={<PenerimaanListPage />} />
              <Route path="/kepala-gudang/penerimaan/intake-petani" element={<IntakePetaniPage />} />
              <Route path="/kepala-gudang/penerimaan/intake-petani/:id" element={<IntakePetaniDetailPage />} />
              <Route path="/kepala-gudang/penerimaan/:id/grading" element={<GradingPage />} />
              <Route path="/kepala-gudang/ajukan-kebutuhan" element={<PermintaanPengadaanPage />} />
              <Route path="/kepala-gudang/riwayat-pengajuan" element={<DaftarPermintaanPage />} />
              <Route path="/kepala-gudang/daftar-permintaan" element={<DaftarPermintaanPage />} />
              <Route path="/kepala-gudang/harga-penerimaan" element={<HargaPenerimaanPage />} />
              <Route path="/kepala-gudang/penyusutan-komoditas" element={<PenyusutanKomoditasPage />} />
              <Route path="/kepala-gudang/kepala-petani" element={<PenerimaanKepalaPetaniListPage />} />
              <Route path="/kepala-gudang/kepala-petani/:id" element={<PenerimaanKepalaPetaniDetailPage />} />
              <Route path="/kepala-gudang/pemrosesan" element={<PemrosesanRingkasanPage />} />
              <Route path="/kepala-gudang/pemrosesan/tren-toko" element={<TrenTokoLanggananPage />} />
              <Route path="/kepala-gudang/pemrosesan/sortir" element={<PemrosesanSortirPage />} />
              <Route path="/kepala-gudang/pemrosesan/grading" element={<PemrosesanGradingPage />} />
              <Route path="/kepala-gudang/pemrosesan/pengemasan" element={<PemrosesanPengemasanPage />} />
              <Route path="/kepala-gudang/pemrosesan/laporan-batch" element={<LaporanBatchPage />} />
              <Route path="/kepala-gudang/pemrosesan/jadwal-produksi" element={<JadwalProduksiPage />} />
              <Route path="/kepala-gudang/pemrosesan/jadwal-produksi/baru" element={<BuatJadwalPage />} />
              <Route path="/kepala-gudang/pemrosesan/jadwal-produksi/:id" element={<DetailJadwalPage />} />
              <Route path="/kepala-gudang/komoditas" element={<KomoditasReadOnlyPage />} />
              <Route path="/kepala-gudang/stok" element={<StokManagementPage />} />
              <Route path="/kepala-gudang/penjualan" element={<PenjualanDashboardPage />} />
              <Route path="/kepala-gudang/penjualan/produk" element={<ProdukJualPage />} />
              <Route path="/kepala-gudang/penjualan/tren" element={<TrenPenjualanPage />} />
              <Route path="/kepala-gudang/penjualan/hpp" element={<HppPengaturanPage />} />
              <Route path="/kepala-gudang/penjualan/laporan-hpp" element={<LaporanHppPage />} />
              <Route path="/kepala-gudang/penjualan/seller" element={<PenjualanSellerListPage />} />
              <Route path="/kepala-gudang/penjualan/seller/:id" element={<PenjualanSellerDetailPage />} />
              <Route path="/kepala-gudang/pengajuan" element={<PengajuanListPage />} />
              <Route path="/kepala-gudang/pengajuan/riwayat" element={<PengajuanRiwayatPage />} />
              <Route path="/kepala-gudang/pengajuan/:id" element={<PengajuanDetailPage />} />
              <Route path="/kepala-gudang/profil" element={<ProfilGudangPage />} />
            </Route>

            {/* ══════════════════════════════════════════════════════════
                STAF GUDANG Section
                - Pemrosesan: Sortir → Grading → Pengemasan → Stok
                - Penerimaan: Intake & record
                - Penjualan: Barang keluar
               ══════════════════════════════════════════════════════════ */}
            <Route element={<RoleRoute allowedRoles={['STAF_GUDANG', 'SUPER_ADMIN']} />}>
              <Route path="/staf" element={<PemrosesanRingkasanPage />} />
              <Route path="/staf/pemrosesan" element={<PemrosesanRingkasanPage />} />
              <Route path="/staf/pemrosesan/tren-toko" element={<TrenTokoLanggananPage />} />
              <Route path="/staf/pemrosesan/sortir" element={<PemrosesanSortirPage />} />
              <Route path="/staf/pemrosesan/grading" element={<PemrosesanGradingPage />} />
              <Route path="/staf/pemrosesan/pengemasan" element={<PemrosesanPengemasanPage />} />
              <Route path="/staf/pemrosesan/laporan-batch" element={<LaporanBatchPage />} />
              <Route path="/staf/pemrosesan/jadwal-produksi" element={<JadwalProduksiPage />} />
              <Route path="/staf/pemrosesan/jadwal-produksi/baru" element={<BuatJadwalPage />} />
              <Route path="/staf/pemrosesan/jadwal-produksi/:id" element={<DetailJadwalPage />} />
              <Route path="/staf/info" element={<StafInfoPage />} />
              <Route path="/staf/penerimaan" element={<PenerimaanDashboardPage />} />
              <Route path="/staf/penerimaan/daftar" element={<PenerimaanListPage />} />
              <Route path="/staf/harga-penerimaan" element={<HargaPenerimaanPage />} />
              <Route path="/staf/penerimaan/intake-petani" element={<IntakePetaniPage />} />
              <Route path="/staf/penerimaan/intake-petani/:id" element={<IntakePetaniDetailPage />} />
              <Route path="/staf/penerimaan/:id/grading" element={<GradingPage />} />
              <Route path="/staf/penjualan" element={<PenjualanDashboardPage />} />
              <Route path="/staf/penjualan/produk" element={<ProdukJualPage />} />
              <Route path="/staf/penjualan/tren" element={<TrenPenjualanPage />} />
              <Route path="/staf/penjualan/hpp" element={<HppPengaturanPage />} />
              <Route path="/staf/penjualan/laporan-hpp" element={<LaporanHppPage />} />
              <Route path="/staf/penjualan/seller" element={<PenjualanSellerListPage />} />
              <Route path="/staf/penjualan/seller/:id" element={<PenjualanSellerDetailPage />} />
              <Route path="/staf/penjualan-keluar" element={<BarangKeluarPage />} />
              <Route path="/staf/pengajuan" element={<PengajuanListPage />} />
              <Route path="/staf/pengajuan/riwayat" element={<PengajuanRiwayatPage />} />
              <Route path="/staf/pengajuan/:id" element={<PengajuanDetailPage />} />
              <Route path="/staf/stok" element={<StokManagementPage />} />
              <Route path="/staf/produk" element={<ProdukCatalogPage />} />
              <Route path="/staf/profil" element={<ProfilGudangPage />} />
            </Route>

            {/* ══════════════════════════════════════════════════════════
                ADMIN (SUPER_ADMIN) Section — Full access
               ══════════════════════════════════════════════════════════ */}
            <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/gudang" element={<GudangListPage />} />
              <Route path="/admin/gudang/baru" element={<GudangBaruPage />} />
              <Route path="/admin/gudang/kepala-gudang-baru" element={<KepalGudangBaruPage />} />
              <Route path="/admin/master-komoditas" element={<MasterKomoditasPage />} />
              <Route path="/admin/master-varian" element={<MasterVarianPage />} />
              <Route path="/admin/afiliasi" element={<AfiliasiManagePage />} />
              <Route path="/admin/stok" element={<StokManagementPage />} />
              <Route path="/admin/produk" element={<ProdukCatalogPage />} />
              <Route path="/admin/profil-gudang" element={<ProfilGudangPage />} />
              <Route path="/admin/penerimaan" element={<PenerimaanDashboardPage />} />
              <Route path="/admin/pemrosesan" element={<PemrosesanRingkasanPage />} />
              <Route path="/admin/penjualan" element={<PenjualanDashboardPage />} />
              <Route path="/admin/kepala-petani" element={<PenerimaanKepalaPetaniListPage />} />
              <Route path="/admin/kepala-petani/:id" element={<PenerimaanKepalaPetaniDetailPage />} />
            </Route>
          </Route>
        </Route>

        {/* Global Fallback → Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
