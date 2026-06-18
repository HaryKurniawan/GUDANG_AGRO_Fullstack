import React, { useState, useEffect } from "react";
import { 
  Shield, X, Bell, LogOut, AlertOctagon, CheckSquare 
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import SBUOrdersView from "./components/SBUOrdersView";
import RawMaterialsProcurementView from "./components/RawMaterialsProcurementView";
import PenerimaanBahanBakuView from "./components/PenerimaanBahanBakuView";
import TimbangUlangView from "./components/TimbangUlangView";
import QualityControlView from "./components/QualityControlView";
import ProductionView from "./components/ProductionView";
import HppView from "./components/HppView";
import ShipmentView from "./components/ShipmentView";
import AuditLogView from "./components/AuditLogView";
import DocumentationView from "./components/DocumentationView";

import { UserSession, SystemNotification } from "./types";

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Global Notification States
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // System statistics & notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Auto clean notifications after 5 seconds
  useEffect(() => {
    if (successNotification) {
      const timer = setTimeout(() => setSuccessNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successNotification]);

  useEffect(() => {
    if (errorNotification) {
      const timer = setTimeout(() => setErrorNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorNotification]);

  // Check saved session in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("frozen_wms_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch (e) {
        localStorage.removeItem("frozen_wms_session");
      }
    }
  }, []);

  const fetchStatsAndAlerts = async () => {
    if (!session) return;
    try {
      const nResponse = await fetch("/api/notifications");
      if (nResponse.ok) {
        const data = await nResponse.json();
        setNotifications(data);
      }
    } catch (e) {
      console.warn("Retrying database sync...");
    }
  };

  useEffect(() => {
    if (session) {
      fetchStatsAndAlerts();
      // Auto refresh notifications every 15 seconds
      const interval = setInterval(fetchStatsAndAlerts, 15000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const handleLoginSuccess = (user: UserSession) => {
    setSession(user);
    localStorage.setItem("frozen_wms_session", JSON.stringify(user));
    setActiveTab("dashboard");
    setSuccessNotification(`Selamat datang kembali, ${user.fullName}. Akses ${user.role} disahkan.`);
  };

  const handleLogout = () => {
    if (session) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: session.username })
      }).finally(() => {
        setSession(null);
        localStorage.removeItem("frozen_wms_session");
        setSuccessNotification("Sesi dinonaktifkan. Anda telah keluar dari sistem.");
      });
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "PUT" });
      if (response.ok) {
        fetchStatsAndAlerts();
        setSuccessNotification("Seluruh notifikasi telah ditandai dibaca.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      fetchStatsAndAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  // Active unread alerts badge
  const unreadCount = notifications.filter(n => !n.read).length;

  // If there's no active login session, render Login view
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center px-4 relative overflow-hidden font-sans">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        
        {/* Animated ambient blob */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Success/Error notifications (Full screen layer) */}
        {errorNotification && (
          <div className="fixed top-4 z-50 max-w-sm w-full bg-rose-950 border border-rose-900 text-rose-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-2xl animate-bounce">
            <span className="text-xs font-bold">{errorNotification}</span>
            <button onClick={() => setErrorNotification(null)} className="text-rose-400 hover:text-white ml-2">
              <X size={15} />
            </button>
          </div>
        )}
        {successNotification && (
          <div className="fixed top-4 z-50 max-w-sm w-full bg-emerald-950 border border-emerald-900 text-emerald-400 px-4 py-3 rounded-xl flex items-center justify-between shadow-2xl">
            <span className="text-xs font-bold">{successNotification}</span>
            <button onClick={() => setSuccessNotification(null)} className="text-emerald-400 hover:text-white ml-2">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Center Card */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-md relative z-10">
          <LoginView 
            onLoginSuccess={handleLoginSuccess} 
            setErrorNotification={setErrorNotification} 
            setSuccessNotification={setSuccessNotification}
          />
        </div>

        {/* Simple Human Footer */}
        <div className="pb-6 text-center text-[10px] text-slate-600 font-mono select-none z-10">
          PT. FROZEN WEST VEGETABLES • INTEGRATED WMS COLD-STORE v1.4.2
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-hidden sleek-theme">
      
      {/* SIDEBAR NAVIGATION PANEL (Role-Based Access Control) */}
      <Sidebar 
        session={session} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        unreadCount={unreadCount} 
      />

      {/* CORE ERP MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* GLOBAL HEADER BAR */}
        <header className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 font-sans relative z-30 select-none">
          <div className="flex items-center space-x-3">
            <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-semibold flex items-center">
              <Shield size={12} className="text-emerald-600 mr-1.5" />
              <span>Sesi: {session.fullName} ({session.role})</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Realtime alerts ring */}
            <button 
              onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
              className="p-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center space-x-1.5 relative border border-slate-200 text-xs cursor-pointer font-bold select-none"
            >
              <Bell size={14} className={unreadCount > 0 ? "text-emerald-600 animate-bounce" : "text-slate-500"} />
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>

            {/* Logout actions */}
            <button
              onClick={handleLogout}
              className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-650 text-rose-600 font-bold border border-rose-100 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer select-none transition-all"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* DYNAMIC VIEW CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          
          {/* Global Alert Toasts inside active dashboard view */}
          {errorNotification && (
            <div className="mb-4 p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 font-medium flex items-start space-x-2 animate-pulse">
              <AlertOctagon size={16} className="shrink-0 text-rose-400" />
              <span>{errorNotification}</span>
            </div>
          )}
          {successNotification && (
            <div className="mb-4 p-4 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-white text-xs font-semibold flex items-start space-x-2">
              <CheckSquare size={16} className="shrink-0 text-emerald-400" />
              <span>{successNotification}</span>
            </div>
          )}

          {/* Tab Route Router Switch */}
          {activeTab === "dashboard" && (
            <DashboardView 
              session={session} 
              notifications={notifications} 
              onMarkNotificationsAsRead={handleMarkAllNotificationsAsRead} 
            />
          )}

          {activeTab === "orders" && (
            <SBUOrdersView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "procurements" && (
            <RawMaterialsProcurementView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "receiving" && (
            <PenerimaanBahanBakuView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
            />
          )}

          {activeTab === "weighing" && (
            <TimbangUlangView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "qc" && (
            <QualityControlView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "production" && (
            <ProductionView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "hpp" && (
            <HppView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "shipments" && (
            <ShipmentView 
              session={session} 
              setErrorNotification={setErrorNotification} 
              setSuccessNotification={setSuccessNotification} 
              triggerRefreshStats={fetchStatsAndAlerts}
            />
          )}

          {activeTab === "audits" && (
            <AuditLogView 
              session={session} 
              setErrorNotification={setErrorNotification} 
            />
          )}

          {activeTab === "docs" && (
            <DocumentationView />
          )}

        </main>

        {/* SYSTEM REALTIME NOTIFICATION SLIDER DRAWER */}
        {showNotificationDrawer && (
          <>
            {/* Backdrop overlay for easy tap-to-dismiss */}
            <div 
              className="fixed inset-0 bg-slate-900/15 backdrop-blur-[1px] z-[90] transition-opacity"
              onClick={() => setShowNotificationDrawer(false)}
            />

            {/* The Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-[100] flex flex-col justify-between font-sans animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-slate-150 border-slate-100 flex justify-between items-center select-none shrink-0 bg-slate-50">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center font-display">
                  <Bell size={13} className="mr-1.5 text-emerald-600" /> Notifikasi Sistem ({unreadCount})
                </span>
                <button 
                  onClick={() => setShowNotificationDrawer(false)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 font-bold text-xs flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer select-none"
                  title="Tutup Notifikasi"
                >
                  <span>Tutup</span>
                  <X size={13} />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono text-center py-12 italic">Tidak ada pesan masuk.</p>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        n.read 
                          ? 'bg-slate-50/50 border-slate-100 text-slate-450' 
                          : 'bg-emerald-50/40 border-emerald-100/60 text-slate-800 shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start font-mono text-[9px] tracking-wide">
                        <span className={n.read ? "text-slate-400" : "text-emerald-600 font-bold"}>
                          {n.type.toUpperCase()}
                        </span>
                        <span className="text-slate-405 text-slate-400">{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="leading-relaxed font-sans font-medium text-slate-750">{n.message}</p>
                      
                      {!n.read && (
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md font-mono border border-emerald-100 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          ✓ Tandai Dibaca
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-150 border-slate-100 flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNotificationDrawer(false)}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center shadow-xs"
                >
                  Keluar & Selesai Membaca
                </button>
                <div className="font-mono text-[9px] text-slate-450 text-slate-400 text-center select-none">
                  Auto polling is active (15s query cycle)
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
