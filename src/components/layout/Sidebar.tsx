'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  DollarSign,
  Package,
  Zap,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sesi Harian', href: '/sessions', icon: Calendar },
  { name: 'Penjualan', href: '/sales', icon: ShoppingCart },
  { name: 'Pengeluaran', href: '/expenses', icon: DollarSign },
  { name: 'Modal', href: '/capital', icon: Zap },
  { name: 'Investor', href: '/investors', icon: Users },
  { name: 'Bahan Baku', href: '/materials', icon: Package },
  { name: 'Produk', href: '/products', icon: BarChart3 },
  { name: 'Laporan', href: '/reports', icon: BarChart3 },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await getSupabase().auth.signOut();
    } catch (error) {
      // Ignore error if Supabase not configured
    }
    window.location.href = '/login';
  }

  return (
    <aside className="w-64 bg-orange-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-orange-800">
        <h1 className="text-2xl font-bold">Roti Bakar</h1>
        <p className="text-xs  text-orange-100">Sistem Keuangan</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-700 text-white'
                  : 'text-orange-100 hover:bg-orange-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-orange-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-orange-100 hover:bg-orange-800 w-full text-left transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
