 'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SalesTable } from '@/components/tables/SalesTable';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Sale, Expense, DailySession, MaterialPurchase } from '@/types';
import { useParams } from 'next/navigation';
import { useOutlet } from '@/lib/context/OutletContext';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BatchSaleForm from '@/components/forms/BatchSaleForm';

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params?.id as string;
  const { outletId } = useOutlet();

  const [session, setSession] = useState<DailySession | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
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
          if (!outletId) {
            setSales([]);
            setExpenses([]);
            setPurchases([]);
            return;
          }

          try {
            const salesRes = await fetch(`/api/sales?outlet_id=${outletId}&session_id=${sessionId}&limit=500`);
            const salesData = salesRes.ok ? await salesRes.json() : [];
            setSales(Array.isArray(salesData) ? salesData : []);
          } catch (e) {
            console.warn('Failed to fetch sales:', e);
            setSales([]);
          }

          try {
            const expensesRes = await fetch(`/api/expenses?outlet_id=${outletId}&session_id=${sessionId}&limit=500`);
            const expensesData = expensesRes.ok ? await expensesRes.json() : [];
            setExpenses(Array.isArray(expensesData) ? expensesData : []);
          } catch (e) {
            console.warn('Failed to fetch expenses:', e);
            setExpenses([]);
          }

          try {
            const purchasesRes = await fetch(`/api/material-purchases?outlet_id=${outletId}&session_id=${sessionId}`);
            const purchasesData = purchasesRes.ok ? await purchasesRes.json() : [];
            setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
          } catch (e) {
            console.warn('Failed to fetch material purchases:', e);
            setPurchases([]);
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

  async function refreshSales() {
    if (!outletId || !sessionId) return;
    try {
      const salesRes = await fetch(`/api/sales?outlet_id=${outletId}&session_id=${sessionId}&limit=500`);
      const salesData = salesRes.ok ? await salesRes.json() : [];
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (e) {
      console.warn('Failed to refresh sales:', e);
    }
  }

  async function handleBatchSaleSubmit(payload: any) {
    if (!outletId || !sessionId) {
      alert('Outlet atau sesi tidak tersedia');
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, session_id: sessionId, outlet_id: outletId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Gagal menyimpan penjualan');
      }

      await refreshSales();
      alert('Penjualan berhasil disimpan');
    } catch (err: any) {
      console.error('Batch sale submit error:', err);
      alert('Gagal menyimpan: ' + (err.message || err));
    }
  }

  const totalSales = sales.reduce((sum, s) => sum + (s.net_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + (purchase.total_amount || Number(purchase.quantity) * Number(purchase.unit_price)),
    0
  );
  const expectedClosing = (session?.opening_cash || 0) + totalSales - totalExpenses - totalPurchases;

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
              <p className="text-sm text-gray-600">Pembelian Bahan</p>
              <p className="text-lg font-semibold text-amber-600">Rp {totalPurchases.toLocaleString('id-ID')}</p>
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
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Daftar Penjualan</h3>
            {session?.status === 'open' && (
              <Dialog>
                <DialogTrigger>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Tambah Penjualan (Batch)</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Penjualan (Batch)</DialogTitle>
                  </DialogHeader>
                  <BatchSaleForm onSubmit={handleBatchSaleSubmit} sessionId={sessionId} outletId={outletId} />
                  <DialogFooter />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <SalesTable sales={sales} />
        </div>
        <ExpensesTable expenses={expenses} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pembelian Bahan pada Sesi Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Tidak ada pembelian bahan pada sesi ini</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tanggal</th>
                    <th className="text-left p-2">Bahan</th>
                    <th className="text-left p-2">Supplier</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-left p-2">Status Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{purchase.date}</td>
                      <td className="p-2">{purchase.raw_material_id || '-'}</td>
                      <td className="p-2">{purchase.supplier_id || '-'}</td>
                      <td className="p-2 text-right">{Number(purchase.quantity).toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right font-semibold">
                        Rp {(purchase.total_amount || Number(purchase.quantity) * Number(purchase.unit_price)).toLocaleString('id-ID')}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{purchase.payment_status || 'Unknown'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}