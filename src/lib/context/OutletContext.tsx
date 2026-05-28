'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Outlet } from '@/types';

interface OutletContextType {
  outletId: string;
  sessionId: string | null;
  availableOutlets: Outlet[];
  isReady: boolean;
  setOutletId: (id: string) => void;
  setSessionId: (id: string | null) => void;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedOutletId';

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const [outletId, setOutletIdState] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadOutlets() {
      try {
        const res = await fetch('/api/outlets');
        const data = res.ok ? await res.json() : [];
        const outlets = Array.isArray(data) ? data : [];
        setAvailableOutlets(outlets);

        const savedOutletId = window.localStorage.getItem(STORAGE_KEY);
        const preferredOutletId =
          (savedOutletId && outlets.some((outlet: Outlet) => outlet.id === savedOutletId) && savedOutletId) ||
          outlets[0]?.id ||
          '';

        setOutletIdState(preferredOutletId);
        if (preferredOutletId) {
          window.localStorage.setItem(STORAGE_KEY, preferredOutletId);
        }
      } catch {
        setAvailableOutlets([]);
        setOutletIdState('');
      } finally {
        setIsReady(true);
      }
    }

    loadOutlets();
  }, []);

  const setOutletId = (id: string) => {
    setOutletIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        window.localStorage.setItem(STORAGE_KEY, id);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const contextValue = useMemo(
    () => ({ outletId, sessionId, availableOutlets, isReady, setOutletId, setSessionId }),
    [outletId, sessionId, availableOutlets, isReady]
  );

  if (!isReady) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat outlet...</div>;
  }

  if (!outletId) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        Tidak ada outlet tersedia. Jalankan seed atau pilih outlet yang valid di database.
      </div>
    );
  }

  return (
    <OutletContext.Provider value={contextValue}>
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error('useOutlet must be used within OutletProvider');
  }
  return context;
}
