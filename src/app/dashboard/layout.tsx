'use client';

import { useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { OutletProvider, useOutlet } from '@/lib/context/OutletContext';

function DashboardPrefetcher() {
  const { outletId } = useOutlet();
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    if (!outletId || hasPrefetchedRef.current) return;

    hasPrefetchedRef.current = true;

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `dashboard-metrics:${outletId}:${today}`;

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { cachedAt?: number };
        if (parsed.cachedAt && Date.now() - parsed.cachedAt < 5 * 60 * 1000) {
          return;
        }
      }
    } catch {
      // Ignore storage read issues and continue with a fresh fetch.
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void fetch(`/api/dashboard?outlet_id=${outletId}&date=${today}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return;
          const data = await response.json();
          window.localStorage.setItem(cacheKey, JSON.stringify({ metrics: data, cachedAt: Date.now() }));
        })
        .catch(() => undefined);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [outletId]);

  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OutletProvider>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
            <DashboardPrefetcher />
            {children}
          </div>
        </main>
      </div>
    </OutletProvider>
  );
}
