/**
 * EcommerceTrenClient — Task 6
 *
 * Client untuk menarik data tren komoditas global dari ECOMMERCE analytics.
 * Dipakai saat membuat PermintaanPengadaan (Task 7) untuk mengisi snapshot tren.
 */

import axios from 'axios';

const ECOMMERCE_URL = process.env.ECOMMERCE_BACKEND_URL || 'http://127.0.0.1:4000';
const ECOMMERCE_API_KEY = process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key';
const TIMEOUT = parseInt(process.env.ECOMMERCE_TREN_TIMEOUT_MS || '5000');

export interface TrenKomoditasGlobalItem {
  kodeKomoditasGlobal: string;
  komoditasNama: string;
  jumlahTerjualKgBulanIni: number;
  jumlahTerjualKgBulanLalu: number;
  trendArah: 'UP' | 'DOWN' | 'STABLE';
  trendPersen: number | null;
  hargaJualRataRataPerKg: number;
  jumlahSellerMenjual: number;
}

export interface TrenKomoditasGlobalResponse {
  periode: string;
  periodeSebelumnya: string;
  generatedAt: string;
  data: TrenKomoditasGlobalItem[];
}

/**
 * Mengambil tren komoditas global dari ECOMMERCE.
 * Mengembalikan null jika gagal (non-blocking).
 */
export async function getTrenKomoditasGlobal(
  kodeKomoditasGlobal?: string
): Promise<TrenKomoditasGlobalResponse | null> {
  try {
    const params = new URLSearchParams();
    if (kodeKomoditasGlobal) {
      params.set('kodeKomoditasGlobal', kodeKomoditasGlobal);
    }

    const url = `${ECOMMERCE_URL}/api/analytics/tren-komoditas-global${params.toString() ? '?' + params.toString() : ''}`;

    const response = await axios.get<TrenKomoditasGlobalResponse>(url, {
      headers: { 'x-api-key': ECOMMERCE_API_KEY },
      timeout: TIMEOUT,
    });

    return response.data;
  } catch (error: unknown) {
    console.error(
      `[EcommerceTrenClient] Gagal mengambil tren${kodeKomoditasGlobal ? ` untuk ${kodeKomoditasGlobal}` : ''}:`,
      (error as Error).message
    );
    return null;
  }
}

/**
 * Mengambil tren untuk satu komoditas spesifik.
 * Mengembalikan item pertama atau null.
 */
export async function getTrenSatuKomoditas(
  kodeKomoditasGlobal: string
): Promise<TrenKomoditasGlobalItem | null> {
  const result = await getTrenKomoditasGlobal(kodeKomoditasGlobal);
  if (!result || result.data.length === 0) return null;
  return result.data[0];
}
