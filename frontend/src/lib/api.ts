import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5005/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto inject JWT token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gudang_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auto handle unauthorized response globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('gudang_token');
      // If we are not already on the login page, redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Afiliasi & Kepala Petani endpoints
export const getKepalaPetaniTerafiliasi = async (gudangKode?: string, status: string = 'aktif') => {
  const params = new URLSearchParams();
  if (gudangKode) params.append('gudangKode', gudangKode);
  if (status) params.append('status', status);
  
  const response = await api.get(`/afiliasi/kepala-petani?${params.toString()}`);
  return response.data;
};

export const getKepalaPetaniDetail = async (petaniId: string) => {
  const response = await api.get(`/afiliasi/kepala-petani/${petaniId}`);
  return response.data;
};

export const getAfiliasiAktifPerGudang = async (gudangKode: string) => {
  const response = await api.get(`/afiliasi/gudang/${gudangKode}/aktif`);
  return response.data;
};

// Admin Afiliasi Management
export const getKepalaPetaniTersedia = async (search?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  
  const response = await api.get(`/afiliasi/petani-tersedia?${params.toString()}`);
  return response.data;
};

export const listAfiliasiAdmin = async (filters?: {
  gudangId?: string;
  status?: string;
  role?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.gudangId) params.append('gudangId', filters.gudangId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.search) params.append('search', filters.search);
  
  const response = await api.get(`/afiliasi/list-all?${params.toString()}`);
  return response.data;
};

export const createAfiliasiManual = async (data: {
  petaniId: string;
  kepalaPetaniId?: string;
  gudangId: string;
  petaniNama: string;
  petaniNik?: string;
  noHp?: string;
  role: 'petani' | 'kepala_petani';
  status?: 'aktif' | 'nonaktif';
}) => {
  const response = await api.post('/afiliasi/manual', data);
  return response.data;
};

export const updateAfiliasi = async (id: string, data: any) => {
  const response = await api.put(`/afiliasi/${id}`, data);
  return response.data;
};

export const deleteAfiliasi = async (id: string) => {
  const response = await api.delete(`/afiliasi/${id}`);
  return response.data;
};

// Gudang Management
export const createWarehouse = async (data: any) => {
  const response = await api.post('/gudang/admin', data);
  return response.data;
};

export const createKepalGudang = async (data: {
  gudangId: string;
  nama: string;
  email: string;
  password: string;
  noTelepon?: string;
  kepalaPetaniIdList?: string[];
}) => {
  const response = await api.post('/gudang/admin/kepala-gudang', data);
  return response.data;
};

// Product Management (Produk Gudang untuk dijual ke seller)
export const getProdukGudangList = async (gudangId?: string) => {
  const params = new URLSearchParams();
  if (gudangId) params.append('gudangId', gudangId);
  const response = await api.get(`/produk/admin?${params.toString()}`);
  return response.data;
};


export default api;