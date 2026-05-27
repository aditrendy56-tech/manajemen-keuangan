'use client';

import { useState, useEffect } from 'react';
import { SaleForm } from '@/components/forms/SaleForm';
import { SalesTable } from '@/components/tables/SalesTable';
import { Sale } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function SalesPage() {
  const { outletId, sessionId, setSessionId } = useOutlet();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSales();
    // Auto-create or get today's session if not exists
    ensureSession();
  }, [outletId]);

  async function ensureSession() {
    try {
      // Get today's sessions
      const response = await fetch(`/api/sessions?outlet_id=${outletId}`);
      if (response.ok) {
        const sessions = await response.json();
        // Find today's open session
        const today = new Date().toISOString().split('T')[0];
        const todaySession = sessions.find(
          (s: any) => s.date === today && s.status === 'open'
        );
        
        if (todaySession) {
          setSessionId(todaySession.id);
        } else {
          // Create new session for today
          const createResponse = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outlet_id: outletId,
              date: today,
              opening_cash: 0,
            }),
          });
          if (createResponse.ok) {
            const newSession = await createResponse.json();
            setSessionId(newSession.id);
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring session:', error);
    }
  }

  async function fetchSales() {
    try {
      setFetching(true);
      const response = await fetch(`/api/sales?outlet_id=${outletId}`);
      if (response.ok) {
        const data = await response.json();
        setSales(data || []);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(data: any) {
    if (!sessionId) {
      alert('Session belum tersedia. Mohon tunggu...');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          outlet_id: outletId,
          session_id: sessionId,
        }),
      });
      
      if (response.ok) {
        await fetchSales();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error saving sale');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Penjualan</h1>
        <p className="text-gray-600">Input dan kelola data penjualan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesTable sales={sales} />
        </div>
        <div>
          <SaleForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}