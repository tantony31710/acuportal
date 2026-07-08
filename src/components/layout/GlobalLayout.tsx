import React from 'react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../lib/store';
import { Link } from 'react-router-dom';

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Global Sidebar - Polished UX */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-950 p-4 transition-transform duration-300",
        !sidebarOpen && "-translate-x-full"
      )}>
        <h2 className="text-xl font-bold mb-6 text-teal-400">Acuportal Extreme</h2>
        <nav className="space-y-2">
          <Link to="/teacher" className="block p-2 hover:bg-slate-800 rounded">Dashboard</Link>
          <Link to="/roster" className="block p-2 hover:bg-slate-800 rounded">Roster</Link>
          <Link to="/admin" className="block p-2 hover:bg-slate-800 rounded">Admin</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-8 transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-0"
      )}>
        <button onClick={toggleSidebar} className="mb-4 text-sm bg-slate-800 p-2 rounded">
          {sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
        </button>
        {children}
      </main>
    </div>
  );
}
