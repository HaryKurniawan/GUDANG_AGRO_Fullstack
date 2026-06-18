import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Warehouse, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';

type PageState = 'validating' | 'invalid' | 'form' | 'loading' | 'success';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [pageState, setPageState] = useState<PageState>('validating');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // Validasi token saat halaman dibuka
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await api.get(`/auth/reset-password/validate?token=${token}`);
        setEmail(response.data?.email || '');
        setPageState('form');
      } catch {
        setPageState('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setPageState('loading');

    try {
      await api.post('/auth/reset-password', { token, password });
      setPageState('success');
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Gagal mereset password. Silakan coba lagi.';
      setError(message);
      setPageState('form');
    }
  };

  const renderContent = () => {
    switch (pageState) {
      case 'validating':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Memvalidasi token...</p>
          </div>
        );

      case 'invalid':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Tidak Valid</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Link reset password ini tidak valid atau sudah kedaluwarsa.
              Link hanya berlaku selama <strong>1 jam</strong> setelah dikirim.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm text-center transition-colors mb-3"
            >
              Minta Link Baru
            </Link>
            <Link
              to="/login"
              className="block text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Kembali ke login
            </Link>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Berhasil Diperbarui!</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Password akun Anda telah berhasil diubah. Silakan login dengan password baru.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Masuk Sekarang
            </button>
          </div>
        );

      case 'form':
      case 'loading':
      default:
        return (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Buat Password Baru</h2>
              {email && (
                <p className="text-sm text-gray-500">
                  Untuk akun <span className="font-medium text-gray-700">{email}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Baru */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Password Baru</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Minimal 8 karakter</p>
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Konfirmasi Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Ulangi password baru"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={pageState === 'loading' || !password || !confirmPassword}
                className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pageState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Password Baru</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Kembali ke login
              </Link>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <Warehouse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Portal Gudang</h1>
                <p className="text-xs text-gray-500 mt-0.5">Agro Jabar Warehouse</p>
              </div>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
