import { create } from 'zustand';
import api from '../lib/api';

interface Warehouse {
  id: string;
  kode: string;
  nama: string;
  alamat?: string;
  tipe?: string;
  status?: string;
}

interface User {
  id: string;
  email: string;
  nama: string | null;
  noTelepon: string | null;
  peran: string;
  managedWarehouses: Warehouse[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, kataSandi: string) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  setTokenLogin: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('gudang_token'),
  isAuthenticated: !!localStorage.getItem('gudang_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;

      localStorage.setItem('gudang_token', token);
      set({
        token,
        user,
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login gagal, mohon periksa kembali email & password Anda';
      set({ error: message, loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('gudang_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchProfile: async () => {
    if (!get().token) return;
    set({ loading: true });
    try {
      const response = await api.get('/auth/me');
      const { user } = response.data.data;
      set({ user, isAuthenticated: true, loading: false });
    } catch (error) {
      localStorage.removeItem('gudang_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  setTokenLogin: (token: string) => {
    localStorage.setItem('gudang_token', token);
    set({ token, isAuthenticated: true });
  },
}));
