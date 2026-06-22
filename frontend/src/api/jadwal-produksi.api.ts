import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HariProduksiPreview {
  hariKe: number;
  tanggal: string;
  targetKg: number;
}

export interface PreviewJadwalResult {
  estimasiHari: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  hariProduksi: HariProduksiPreview[];
  kapasitasHarianKg: number;
  estimasiBiayaBorongan: number;
  peringatanOverlap: {
    tanggal: string;
    kapasitasTerpakai: number;
    tambahanDiminta: number;
    kelebihan: number;
  }[];
}

export interface TenagaKerjaBorongan {
  id: string;
  hariProduksiId: string;
  namaPekerja: string;
  kgDikerjakan: number;
  tarifPerKg: number;
  totalUpah: number;
  catatan?: string;
  createdAt: string;
}

export interface HariProduksi {
  id: string;
  jadwalId: string;
  hariKe: number;
  tanggal: string;
  targetKg: number;
  realisasiKg?: number;
  statusHari: 'BELUM' | 'BERJALAN' | 'SELESAI';
  catatan?: string;
  tenagaKerja: TenagaKerjaBorongan[];
}

export interface JadwalProduksi {
  id: string;
  gudangId: string;
  pengajuanId?: string;
  komoditasNama: string;
  volumeTotalKg: number;
  kapasitasHarianKg: number;
  tenggat: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  estimasiHari: number;
  statusJadwal: 'DRAFT' | 'AKTIF' | 'SELESAI' | 'BATAL';
  catatanJadwal?: string;
  createdAt: string;
  hariProduksi: HariProduksi[];
  summary?: {
    totalRealisasiKg: number;
    persenSelesai: number;
    hariSelesai: number;
    hariTotal: number;
    totalBiayaBorongan: number;
    estimasiBiayaBoronganTotal?: number;
  };
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export const jadwalProduksiApi = {
  /** Preview kalkulasi jadwal tanpa simpan ke DB */
  hitungPreview: async (params: {
    volumeTotalKg: number;
    tenggat: string;
    kapasitasHarianKg?: number;
  }): Promise<PreviewJadwalResult> => {
    const res = await api.post('/jadwal-produksi/hitung', params);
    return res.data.data;
  },

  /** Simpan jadwal baru */
  create: async (data: {
    gudangId: string;
    komoditasNama: string;
    volumeTotalKg: number;
    tenggat: string;
    kapasitasHarianKg?: number;
    pengajuanId?: string;
    catatanJadwal?: string;
  }): Promise<JadwalProduksi> => {
    const res = await api.post('/jadwal-produksi', data);
    return res.data.data;
  },

  /** Daftar jadwal */
  getList: async (params?: { gudangId?: string; statusJadwal?: string }): Promise<JadwalProduksi[]> => {
    const res = await api.get('/jadwal-produksi', { params });
    return res.data.data;
  },

  /** Detail jadwal by ID */
  getById: async (id: string): Promise<JadwalProduksi> => {
    const res = await api.get(`/jadwal-produksi/${id}`);
    return res.data.data;
  },

  /** Update status jadwal */
  updateStatus: async (id: string, statusJadwal: string, catatanJadwal?: string) => {
    const res = await api.patch(`/jadwal-produksi/${id}/status`, { statusJadwal, catatanJadwal });
    return res.data.data;
  },

  /** Update realisasi hari produksi */
  updateHari: async (hariId: string, data: { realisasiKg?: number; statusHari?: string; catatan?: string }) => {
    const res = await api.patch(`/jadwal-produksi/hari/${hariId}`, data);
    return res.data.data;
  },

  /** Tambah pekerja borongan ke hari produksi */
  addTenagaKerja: async (
    hariId: string,
    data: { namaPekerja: string; kgDikerjakan: number; tarifPerKg?: number; catatan?: string }
  ): Promise<TenagaKerjaBorongan> => {
    const res = await api.post(`/jadwal-produksi/hari/${hariId}/tenaga-kerja`, data);
    return res.data.data;
  },

  /** Hapus catatan pekerja borongan */
  deleteTenagaKerja: async (id: string) => {
    const res = await api.delete(`/jadwal-produksi/tenaga-kerja/${id}`);
    return res.data;
  },

  /** Cek kapasitas di tanggal tertentu */
  getKapasitas: async (tanggal: string) => {
    const res = await api.get('/jadwal-produksi/kapasitas', { params: { tanggal } });
    return res.data.data;
  },
};

export default jadwalProduksiApi;
