import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api');

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const gudangApi = {
  // Get all gudangs (public - no auth required, but can include token)
  getAllGudangs: async () => {
    try {
      const response = await axiosInstance.get('/gudang');
      return response.data;
    } catch (error: any) {
      // If 401, try without token (public endpoint)
      if (error.response?.status === 401) {
        const publicResponse = await axios.get(`${API_BASE_URL}/gudang`);
        return publicResponse.data;
      }
      throw error;
    }
  },

  // Get gudang by ID (public - no auth required)
  getGudangById: async (id: string) => {
    try {
      const response = await axiosInstance.get(`/gudang/${id}`);
      return response.data;
    } catch (error: any) {
      // If 401, try without token (public endpoint)
      if (error.response?.status === 401) {
        const publicResponse = await axios.get(`${API_BASE_URL}/gudang/${id}`);
        return publicResponse.data;
      }
      throw error;
    }
  },

  // Get my gudangs (admin only)
  getMyGudangs: async () => {
    const response = await axiosInstance.get('/gudang/admin/my');
    return response.data;
  },

  // Create new gudang (SUPER_ADMIN only)
  createGudang: async (data: {
    nama: string;
    kode: string;
    tipe?: string;
    alamat: string;
    kabupaten: string;
    provinsi: string;
    lat?: number;
    lng?: number;
    telepon?: string;
    email?: string;
    kapasitasKg?: number;
    jamOperasional?: string;
  }) => {
    const response = await axiosInstance.post('/gudang/admin', data);
    return response.data;
  },

  // Update gudang (admin only)
  updateGudang: async (id: string, data: any) => {
    const response = await axiosInstance.patch(`/gudang/admin/${id}`, data);
    return response.data;
  },
};

export default gudangApi;
