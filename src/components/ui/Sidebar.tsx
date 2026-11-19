'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Wallet,
  FileBarChart2,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

interface SidebarProps {
  role: UserRole;
  userName: string;
  warkopName: string;
}

export default function Sidebar({ role, userName, warkopName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      label: 'Layar Kasir',
      href: '/kasir',
      icon: Store,
      roles: ['owner', 'cashier'],
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['owner'],
    },
    {
      label: 'Daftar Menu',
      href: '/menu',
      icon: UtensilsCrossed,
      roles: ['owner'],
    },
    {
      label: 'Kas Keluar',
      href: '/kas-keluar',
      icon: Wallet,
      roles: ['owner'],
    },
    {
      label: 'Laporan',
      href: '/laporan',
      icon: FileBarChart2,
      roles: ['owner'],
    },
  ].filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Top Bar Khusus Mobile & Tablet Kecil */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-zinc-950 text-white px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <img
              src="/public/logomatrixpos.png"
              alt="MatrixPOS"
              className="w-8 h-8 rounded-lg object-cover border border-zinc-700"
            />
            <div>
              <p className="text-sm font-semibold leading-tight">{warkopName}</p>
              <p className="text-[11px] text-zinc-400">MatrixPOS</p>
            </div>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 capitalize">
          {role === 'owner' ? 'Owner' : 'Kasir'}
        </span>
      </header>

      {/* Backdrop Overlay Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Utama (Drawer di HP/Tab, Fixed Collapsible di Desktop) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-dvh bg-zinc-950 text-zinc-100 border-r border-zinc-800 flex flex-col justify-between transition-all duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'w-64'}`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src="/public/logomatrixpos.png"
                alt="MatrixPOS Logo"
                className="w-9 h-9 rounded-lg object-cover shrink-0 border border-zinc-700"
              />
              {!collapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-sm tracking-tight text-white truncate">
                    MatrixPOS
                  </h1>
                  <p className="text-xs text-zinc-400 truncate">{warkopName}</p>
                </div>
              )}
            </div>

            {/* Tombol Tutup di Mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tombol Collapse di Desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              title={collapsed ? 'Perlebar Sidebar' : 'Kecilkan Sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigasi Menu */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info User & Logout */}
        <div className="p-3 border-t border-zinc-800 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2 rounded-xl bg-zinc-900/80">
              <p className="text-xs font-medium text-white truncate">{userName}</p>
              <p className="text-[11px] text-zinc-400 capitalize">
                Role: {role === 'owner' ? 'Owner Warkop' : 'Kasir'}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Keluar Akun"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>

          {!collapsed && (
            <p className="text-[10px] text-center text-zinc-600 pt-1">
              Powered by Matrix Labs
            </p>
          )}
        </div>
      </aside>
    </>
  );
}