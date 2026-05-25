'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
    </div>
  );
}
