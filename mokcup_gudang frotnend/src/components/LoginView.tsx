import React, { useState } from "react";
import { ShieldCheck, Lock, User, RefreshCw, KeyRound } from "lucide-react";
import { UserSession } from "../types";

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
}

export default function LoginView({ onLoginSuccess, setErrorNotification, setSuccessNotification }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorNotification("Silakan isi username dan password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Gagal melakukan autentikasi");
      }

      setSuccessNotification(`Selamat datang kembali, ${data.fullName}!`);
      // Save token & info to localStorage for persisting session (Standard JWT/session)
      localStorage.setItem("fzwms_session", JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err: any) {
      setErrorNotification(err.message || "Kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  };

  // Quick Auto Login Preset for Skripsi Grader
  const handleQuickLogin = (userType: 'admin' | 'produksi' | 'pimpinan') => {
    const creds = {
      admin: { u: "admin", p: "admin" },
      produksi: { u: "produksi", p: "produksi" },
      pimpinan: { u: "pimpinan", p: "pimpinan" }
    };
    setUsername(creds[userType].u);
    setPassword(creds[userType].p);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Visual abstract overlay */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl mb-4 border border-emerald-100 shadow-sm">
            <ShieldCheck size={36} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-display">Agro Produksi</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Logistik terpadu & produksi sayuran beku berkualitas tinggi.
          </p>
        </div>

        <div className="bg-white border border-slate-205 border-slate-200 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Username Pegawai
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-450 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Kata Sandi (Password Hashed)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-450 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-sm tracking-wide transition-colors duration-150 flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memverifikasi Autentikasi...</span>
                </>
              ) : (
                <span>Masuk Ke Sistem</span>
              )}
            </button>
          </form>

          {/* Quick Preset Accounts panel for testing & skripsi presentation */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-2 mb-3">
              <KeyRound size={13} className="text-emerald-600 font-bold" />
              <p className="text-xs font-bold text-slate-700 tracking-wide font-display">
                AKSES PENGUJI / DEMO (AKUN SKRIPSI)
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mb-3.5 italic leading-normal">
              Pilih salah satu role untuk otomatis mengisi kredensial dan meniru RBAC (Role-Based Access Control):
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-650 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors duration-100 text-center cursor-pointer"
              >
                Admin Gudang
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('produksi')}
                className="py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-650 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors duration-100 text-center cursor-pointer"
              >
                Ka. Produksi
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('pimpinan')}
                className="py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-650 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors duration-100 text-center cursor-pointer"
              >
                Pimpinan
              </button>
            </div>
          </div>
        </div>

        {/* Protection footer */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
            SECURE SHA-256 JWT ENCRYPTION ENABLED <br />
            © Sistem Informasi Industri Pertanian 2026. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
