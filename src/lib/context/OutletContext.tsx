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
        console.log('[OutletContext] Loading outlets...');
        const res = await fetch('/api/outlets');
        const data = res.ok ? await res.json() : [];
        const outlets = Array.isArray(data) ? data : [];
        console.log('[OutletContext] Outlets loaded:', outlets.length, outlets);
        setAvailableOutlets(outlets);

        const savedOutletId = window.localStorage.getItem(STORAGE_KEY);
        const preferredOutletId =
          (savedOutletId && outlets.some((outlet: Outlet) => outlet.id === savedOutletId) && savedOutletId) ||
          outlets[0]?.id ||
          '';

        console.log('[OutletContext] Setting preferred outlet:', preferredOutletId);
        setOutletIdState(preferredOutletId);
        if (preferredOutletId) {
          window.localStorage.setItem(STORAGE_KEY, preferredOutletId);
        }
      } catch (err) {
        console.error('[OutletContext] Error loading outlets:', err);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat outlet...</p>
          <p className="text-sm text-gray-500 mt-2">Silakan tunggu sebentar</p>
        </div>
      </div>
    );
  }

  if (!outletId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 border-l-4 border-red-600">
          <h1 className="text-xl font-bold text-red-700 mb-4">⚠️ Setup Diperlukan</h1>
          <p className="text-gray-700 mb-6">
            Tidak ada outlet yang tersedia. Sistem memerlukan minimal 1 outlet untuk berjalan.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <h2 className="font-semibold text-blue-900 text-sm mb-3">📋 Solusi Cepat:</h2>
            <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
              <li>Buka file: <code className="bg-white px-2 py-1 rounded text-xs font-mono">database/seed-complete-setup.sql</code></li>
              <li>Login ke <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
              <li>Buka SQL Editor → New Query</li>
              <li>Copy seluruh isi file dan paste</li>
              <li>Klik Run</li>
              <li>Refresh halaman ini (F5)</li>
            </ol>
          </div>

          <div className="bg-gray-100 rounded p-3 text-xs text-gray-600 mb-6">
            <p className="font-mono text-gray-700">
              Lihat: SETUP_OUTLETS.md untuk panduan lengkap
            </p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition-colors"
          >
            🔄 Reload Halaman
          </button>
        </div>
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
