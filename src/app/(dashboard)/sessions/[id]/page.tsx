 'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SalesTable } from '@/components/tables/SalesTable';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Sale, Expense, DailySession } from '@/types';
import { useParams } from 'next/navigation';
import { useOutlet } from '@/lib/context/OutletContext';

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params?.id as string;
  const { outletId } = useOutlet();

  const [session, setSession] = useState<DailySession | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closingCash, setClosingCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const sessionRes = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionRes.ok) throw new Error('Failed to fetch session');
        const sessionData = await sessionRes.json();
        setSession(sessionData || null);

        // fetch sales and expenses but don't let them block session display
        try {
          const salesRes = await fetch(`/api/sales?outlet_id=${outletId}&limit=500`);
          const salesData = salesRes.ok ? await salesRes.json() : [];
          setSales(Array.isArray(salesData) ? salesData.filter((s: Sale) => s.session_id === sessionId) : []);
        } catch (e) {
          console.warn('Failed to fetch sales:', e);
          setSales([]);
        }

        try {
          const expensesRes = await fetch(`/api/expenses?outlet_id=${outletId}&limit=500`);
          const expensesData = expensesRes.ok ? await expensesRes.json() : [];
          setExpenses(Array.isArray(expensesData) ? expensesData.filter((e: Expense) => e.session_id === sessionId) : []);
        } catch (e) {
          console.warn('Failed to fetch expenses:', e);
          setExpenses([]);
        }
      } catch (err: any) {
        console.error('Error loading session detail:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, outletId]);

  const totalSales = sales.reduce((sum, s) => sum + (s.net_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expectedClosing = (session?.opening_cash || 0) + totalSales - totalExpenses;

  async function handleCloseSession() {
    if (!closingCash) {
      alert('Masukkan jumlah cash penutupan');
      return;
    }

    if (!sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to close session');
      }

      const updated = await res.json();
      setSession(updated);
      alert('Sesi ditutup. Selisih: Rp ' + (parseInt(closingCash) - expectedClosing).toLocaleString('id-ID'));
    } catch (err: any) {
      console.error('Error closing session:', err);
      alert('Gagal menutup sesi: ' + (err.message || err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Detail Sesi</h1>
        <p className="text-gray-600">{session ? `Sesi pada ${session.date}` : loading ? 'Memuat...' : error || 'Sesi tidak ditemukan'}</p>
      </div>

      {/* Session Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Sesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Modal Awal</p>
              <p className="text-lg font-semibold">Rp {(session?.opening_cash || 0).toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Penjualan</p>
              <p className="text-lg font-semibold text-green-600">Rp {totalSales.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pengeluaran</p>
              <p className="text-lg font-semibold text-red-600">Rp {totalExpenses.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Perkiraan Akhir</p>
              <p className="text-lg font-semibold text-orange-600">Rp {expectedClosing.toLocaleString('id-ID')}</p>
            </div>
          </div>

          {session?.status === 'open' && (
            <div className="mt-6 pt-6 border-t">
              <Label htmlFor="closing_cash">Jumlah Cash Penutupan (Rp)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="closing_cash"
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="Jumlah cash pada penutupan"
                />
                <Button onClick={handleCloseSession} className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">
                  Tutup Sesi
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales and Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesTable sales={sales} />
        <ExpensesTable expenses={expenses} />
      </div>
    </div>
  );
}