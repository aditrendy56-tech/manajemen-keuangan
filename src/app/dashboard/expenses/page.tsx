'use client';

import { useState, useEffect } from 'react';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Expense } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ValidationWarning {
  errorType: string;
  availableCash?: number;
  available?: number;
  requestedAmount?: number;
  requested?: number;
  shortfall?: number;
  message?: string;
  pendingData?: any;
  kas_source?: string;
}

export default function ExpensesPage() {
  const { outletId, sessionId } = useOutlet();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<ValidationWarning | null>(null);

  // Fetch expenses dari database saat component mount
  useEffect(() => {
    fetchExpenses();
  }, [outletId]);

  async function fetchExpenses() {
    try {
      setFetching(true);
      setError(null);
      const response = await fetch(`/api/expenses?outlet_id=${outletId}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError(err.message);
      setExpenses([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(data: any, forceOverride: boolean = false) {
    console.log('[Expenses] handleSubmit called:', { data, forceOverride, sessionId, outletId });
    
    if (!sessionId) {
      alert('Session belum tersedia. Mohon tunggu...');
      return;
    }

    setLoading(true);
    try {
      setError(null);
      setWarning(null);
      
      const payload = {
        session_id: sessionId,
        outlet_id: outletId,
        force_override: forceOverride,
        ...data,
      };
      
      console.log('[Expenses] Sending POST to /api/expenses:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[Expenses] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('[Expenses] Error response data:', JSON.stringify(errorData, null, 2));
        
        // Handle KAS_TIDAK_CUKUP or BUCKET_INSUFFICIENT warning (soft warning, allow override)
        if ((errorData.errorType === 'KAS_TIDAK_CUKUP' || errorData.errorType === 'BUCKET_INSUFFICIENT') && !forceOverride) {
          console.log('[Expenses] Detected budget warning:', errorData.errorType);
          setWarning({
            errorType: errorData.errorType,
            availableCash: errorData.availableCash || errorData.available,
            requestedAmount: errorData.requestedAmount || errorData.requested,
            shortfall: errorData.shortfall,
            message: errorData.error || errorData.message || 'Kas tidak cukup untuk pengeluaran ini',
            pendingData: data,
            kas_source: errorData.kas_source,
          });
          setLoading(false);
          return;
        }
        
        // Hard error - show and don't allow override
        console.error('[Expenses] Hard error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to save expense');
      }

      await response.json();
      await fetchExpenses();
      setWarning(null);
      // Reset form akan di-handle oleh component
    } catch (err: any) {
      console.error('[Expenses] Error saving expense:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchExpenses();
      } else {
        alert('Gagal menghapus pengeluaran');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengeluaran</h1>
        <p className="text-gray-600">Input dan kelola data pengeluaran</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {warning && (
        <Alert className="border-yellow-400 bg-yellow-50">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800 ml-3">
            <div className="space-y-3">
              <div>
                <strong>⚠️ Peringatan Kas Tidak Cukup!</strong>
                <p className="mt-1 text-sm">{warning.message}</p>
                {warning.kas_source && <p className="mt-1 text-xs text-gray-600">Bucket: {warning.kas_source}</p>}
              </div>
              <div className="bg-white p-3 rounded border border-yellow-200 space-y-1 text-sm">
                <div>Kas Tersedia: <strong>Rp {(warning.availableCash || warning.available || 0).toLocaleString('id-ID')}</strong></div>
                <div>Yang Diminta: <strong>Rp {(warning.requestedAmount || warning.requested || 0).toLocaleString('id-ID')}</strong></div>
                <div className="text-red-600">Kurang: <strong>Rp {(warning.shortfall || 0).toLocaleString('id-ID')}</strong></div>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-xs">Apakah Anda akan melakukan injeksi modal atau penjualan untuk cover pengeluaran ini?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWarning(null)}
                    className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 rounded text-black"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (warning.pendingData) {
                        handleSubmit(warning.pendingData, true);
                      }
                    }}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
                  >
                    {loading ? 'Memproses...' : 'Lanjutkan Walaupun Kas Kurang'}
                  </button>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {fetching ? (
            <div className="text-center py-8 text-gray-500">Loading expenses...</div>
          ) : (
            <ExpensesTable expenses={expenses} onDelete={handleDelete} />
          )}
        </div>
        <div>
          <ExpenseForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}