/**
 * Role-based path helper
 * 
 * Menentukan prefix URL berdasarkan pathname saat ini.
 * Digunakan oleh halaman-halaman yang di-share antar role
 * untuk navigate ke path yang benar.
 * 
 * Example:
 *   pathname = '/kepala-gudang/penjualan/seller/abc'
 *   getRolePrefix(pathname) → '/kepala-gudang'
 *   
 *   pathname = '/staf/penjualan/seller/abc'
 *   getRolePrefix(pathname) → '/staf'
 */
export function getRolePrefix(pathname: string): string {
  if (pathname.startsWith('/kepala-gudang')) return '/kepala-gudang';
  if (pathname.startsWith('/staf')) return '/staf';
  if (pathname.startsWith('/admin')) return '/admin';
  return '/staf'; // fallback
}
