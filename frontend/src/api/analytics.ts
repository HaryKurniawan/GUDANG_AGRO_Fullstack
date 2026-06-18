/// <reference types="vite/client" />
import axios from 'axios';

// Get ECOMMERCE API URL from env, fallback to default dev port
const ECOMMERCE_API_URL = import.meta.env.VITE_ECOMMERCE_API_URL || 'http://localhost:4000/api';

const ecommerceClient = axios.create({
  baseURL: ECOMMERCE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export interface GudangTokoTerlarisItem {
  id: string;
  nama: string;
  gambarUrl: string | null;
  sku: string;
  harga: number;
  totalTerjual: number;
  totalRevenue: number;
  jumlahTransaksi: number;
  sharePersen: number;
}

export interface GudangTokoKategoriTerlaris {
  kategoriId: string;
  kategoriNama: string;
  totalQtyKategori: number;
  totalRevenueKategori: number;
  totalTransaksiKategori: number;
  produkTerlaris: GudangTokoTerlarisItem[];
}

export const analyticsApi = {
  /**
   * Mengambil data produk terlaris toko dari ECOMMERCE backend.
   * Karena ini public endpoint, tidak butuh authorization token staff.
   */
  getTokoTerlaris: async (tokoId: string, limit = 3): Promise<GudangTokoKategoriTerlaris[]> => {
    try {
      const response = await ecommerceClient.get('/analytics/produk-terlaris', {
        params: {
          tokoId,
          period: 'MONTH', // Filter 30 hari terakhir
          limit,
          sortBy: 'terjual',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching best seller from eCommerce:', error);
      throw error;
    }
  },
};

export default analyticsApi;
