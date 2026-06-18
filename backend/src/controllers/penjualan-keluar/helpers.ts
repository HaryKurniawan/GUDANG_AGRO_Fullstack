export const JENIS_PEMBELI = ['PASAR', 'PENGEPUL', 'RESTORAN', 'INDIVIDU', 'LAINNYA'];
export const STATUS_PENJUALAN = ['TERCATAT', 'LUNAS', 'BATAL'];

export function generateNomorPenjualan(): string {
  return `PJK-${Date.now()}`;
}
