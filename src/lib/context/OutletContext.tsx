'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface OutletContextType {
  outletId: string;
  sessionId: string | null;
  setOutletId: (id: string) => void;
  setSessionId: (id: string | null) => void;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const [outletId, setOutletId] = useState('660e8400-e29b-41d4-a716-446655440000');
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <OutletContext.Provider value={{ outletId, sessionId, setOutletId, setSessionId }}>
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
