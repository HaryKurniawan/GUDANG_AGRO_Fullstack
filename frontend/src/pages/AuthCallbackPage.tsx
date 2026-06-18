import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setTokenLogin = useAuthStore((state: any) => state.setTokenLogin);
  const isProcessed = useRef(false);

  useEffect(() => {
    if (isProcessed.current) return;
    isProcessed.current = true;

    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      if (setTokenLogin) {
        setTokenLogin(token);
      } else {
        localStorage.setItem('gudang_token', token);
        window.location.href = '/dashboard';
      }
      navigate('/dashboard');
    } else {
      navigate('/login?error=Gagal+autentikasi+dengan+Google');
    }
  }, [location, navigate, setTokenLogin]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
      <h2 className="text-lg font-semibold text-gray-800">Sedang mengautentikasi...</h2>
      <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar, Anda akan diarahkan ke Dashboard.</p>
    </div>
  );
};

export default AuthCallbackPage;
