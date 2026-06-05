'use client';

import { useState, useEffect } from 'react';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Expense } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function ExpensesPage() {
  const { outletId, sessionId } = useOutlet();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(data: any) {
    if (!sessionId) {
      alert('Session belum tersedia. Mohon tunggu...');
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          outlet_id: outletId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save expense');
      }

      const newExpense = await response.json();
      setExpenses([newExpense, ...expenses]);
      // Reset form akan di-handle oleh component
    } catch (err: any) {
      console.error('Error saving expense:', err);
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
        setExpenses(expenses.filter((e) => e.id !== id));
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