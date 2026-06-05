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
        console.log('[OutletContext] Starting loadOutlets...');
        const res = await fetch('/api/outlets');
        console.log('[OutletContext] /api/outlets response:', res.status);
        const data = res.ok ? await res.json() : [];
        const outlets = Array.isArray(data) ? data : [];
        setAvailableOutlets(outlets);
        console.log('[OutletContext] Loaded outlets:', outlets.length);

        const savedOutletId = window.localStorage.getItem(STORAGE_KEY);
        const preferredOutletId =
          (savedOutletId && outlets.some((outlet: Outlet) => outlet.id === savedOutletId) && savedOutletId) ||
          outlets[0]?.id ||
          '';

        console.log('[OutletContext] Setting outletId to:', preferredOutletId);
        setOutletIdState(preferredOutletId);
        if (preferredOutletId) {
          window.localStorage.setItem(STORAGE_KEY, preferredOutletId);
          
          // Load current session for this outlet
          try {
            console.log('[OutletContext] Loading sessions for outlet:', preferredOutletId);
            const sessionRes = await fetch(`/api/sessions?outlet_id=${preferredOutletId}`);
            console.log('[OutletContext] /api/sessions response:', sessionRes.status);
            const sessions = sessionRes.ok ? await sessionRes.json() : [];
            console.log('[OutletContext] Loaded sessions:', sessions.length, sessions);
            if (Array.isArray(sessions) && sessions.length > 0) {
              // Get the first open session, or just the first one
              const openSession = sessions.find((s: any) => s.status === 'open') || sessions[0];
              console.log('[OutletContext] Selected session:', openSession?.id);
              if (openSession?.id) {
                setSessionId(openSession.id);
                console.log('[OutletContext] SessionId set to:', openSession.id);
              }
            }
          } catch (err) {
            console.warn('[OutletContext] Failed to load current session:', err);
          }
        }
      } catch (err) {
        console.error('[OutletContext] Error in loadOutlets:', err);
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
