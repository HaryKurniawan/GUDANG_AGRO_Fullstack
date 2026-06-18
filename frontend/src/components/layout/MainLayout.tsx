import React from 'react';
import { Outlet } from 'react-router-dom';
import GudangSidebar from './GudangSidebar';

/**
 * MAIN LAYOUT — Mockup Style
 *
 * Layout sederhana:
 * - Sidebar dark (w-64) fixed di kiri
 * - Header bar di atas content area
 * - Content area bg-slate-50
 */

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-hidden">
      {/* Sidebar */}
      <GudangSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
