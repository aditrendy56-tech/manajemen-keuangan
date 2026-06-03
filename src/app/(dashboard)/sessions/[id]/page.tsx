 'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SalesTable } from '@/components/tables/SalesTable';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Sale, Expense, DailySession, MaterialPurchase, CashTransaction } from '@/types';
import { useParams } from 'next/navigation';
import { useOutlet } from '@/lib/context/OutletContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BatchSaleForm from '@/components/forms/BatchSaleForm';
import { ExpenseForm } from '@/components/forms/ExpenseForm';

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params?.id as string;
  const { outletId } = useOutlet();

  const [session, setSession] = useState<DailySession | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [closingCash, setClosingCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundKind, setRefundKind] = useState<'sale' | 'expense'>('sale');
  const [refundTarget, setRefundTarget] = useState<Sale | Expense | null>(null);
  const [refundAmount, setRefundAmount] = useState('0');
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundNotes, setRefundNotes] = useState('');
  const [expenseFormKey, setExpenseFormKey] = useState(0);
  const [salePreset, setSalePreset] = useState<{
    channelType: 'offline' | 'online';
    platform: 'shopeefood' | 'gofood' | '';
    paymentMethod: 'cash' | 'qris' | 'split';
  }>({ channelType: 'offline', platform: '', paymentMethod: 'cash' });

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

          try {
            const cashRes = await fetch(`/api/cash-transactions?outlet_id=${outletId}&limit=500`);
            const cashData = cashRes.ok ? await cashRes.json() : [];
            setCashTransactions(Array.isArray(cashData) ? cashData : []);
          } catch (e) {
            console.warn('Failed to fetch cash transactions:', e);
            setCashTransactions([]);
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

  async function handleExpenseSubmit(data: any) {
    if (!outletId || !sessionId) {
      alert('Outlet atau sesi tidak tersedia');
      return;
    }

    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        session_id: sessionId,
        outlet_id: outletId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Gagal menyimpan pengeluaran');
    }

    const newExpense = await response.json();
    setExpenses((prev) => [newExpense, ...prev]);
    setExpenseFormKey((v) => v + 1);
    setExpenseDialogOpen(false);
  }

  function openRefundDialog(target: Sale | Expense, kind: 'sale' | 'expense') {
    const defaultAmount = kind === 'sale' ? Number((target as Sale).net_amount || 0) : Number((target as Expense).amount || 0);
    setRefundKind(kind);
    setRefundTarget(target);
    setRefundAmount(String(defaultAmount));
    setRefundReason('');
    setRefundReference(`${target.id}-refund`);
    setRefundDate(new Date().toISOString().split('T')[0]);
    setRefundNotes('');
    setRefundDialogOpen(true);
  }

  async function submitRefund() {
    if (!refundTarget) return;

    const endpoint = refundKind === 'sale' ? `/api/sales/${refundTarget.id}` : `/api/expenses/${refundTarget.id}`;
    const originalAmount = refundKind === 'sale' ? Number((refundTarget as Sale).net_amount || 0) : Number((refundTarget as Expense).amount || 0);
    const amountToRefund = Number(refundAmount || 0);

    if (!refundReason.trim()) {
      alert('Alasan refund wajib diisi');
      return;
    }

    if (!amountToRefund || amountToRefund <= 0) {
      alert('Nominal refund harus lebih dari 0');
      return;
    }

    if (amountToRefund > originalAmount) {
      alert('Nominal refund tidak boleh melebihi nominal asli');
      return;
    }

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_status: 'refunded',
        refund_amount: amountToRefund,
        refund_reason: refundReason,
        refunded_at: refundDate,
        refund_reference: refundReference || `${refundTarget.id}-refund`,
        notes: refundNotes || (refundKind === 'sale' ? (refundTarget as Sale).notes : (refundTarget as Expense).notes) || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Gagal refund');
    }

    const updated = await response.json();
    if (refundKind === 'sale') {
      setSales((prev) => prev.map((item) => (item.id === refundTarget.id ? updated : item)));
    } else {
      setExpenses((prev) => prev.map((item) => (item.id === refundTarget.id ? updated : item)));
    }

    setRefundDialogOpen(false);
    setRefundTarget(null);
  }

  function getRecognizedSaleAmount(sale: Sale) {
    const netAmount = Number(sale.net_amount || 0);
    const refundAmount = Number(sale.refund_amount || 0);
    return Math.max(netAmount - refundAmount, 0);
  }

  function getRecognizedExpenseAmount(expense: Expense) {
    const amount = Number(expense.amount || 0);
    const refundAmount = Number(expense.refund_amount || 0);
    return Math.max(amount - refundAmount, 0);
  }

  const saleIds = new Set(sales.map((sale) => sale.id));
  const expenseIds = new Set(expenses.map((expense) => expense.id));
  const purchaseIds = new Set(purchases.map((purchase) => purchase.id));
  const sessionCashTransactions = cashTransactions.filter((transaction) => {
    const sourceType = String((transaction as any).source_type || '');
    const sourceId = String((transaction as any).source_id || '');

    if (sourceType === 'sale' || sourceType === 'sale_refund') return saleIds.has(sourceId);
    if (sourceType === 'expense' || sourceType === 'expense_refund') return expenseIds.has(sourceId);
    if (sourceType === 'material_purchase') return purchaseIds.has(sourceId);
    return false;
  });
  const cashInflow = sessionCashTransactions
    .filter((transaction) => transaction.transaction_type === 'inflow')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const cashOutflow = sessionCashTransactions
    .filter((transaction) => transaction.transaction_type === 'outflow')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const totalSales = sales.reduce((sum, s) => sum + getRecognizedSaleAmount(s), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + getRecognizedExpenseAmount(e), 0);
  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + (purchase.total_amount || Number(purchase.quantity) * Number(purchase.unit_price)),
    0
  );
  const expectedClosing = (session?.opening_cash || 0) + cashInflow - cashOutflow;

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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Daftar Pengeluaran</h3>
          {session?.status === 'open' && (
            <Button onClick={() => setExpenseDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              Input Pengeluaran
            </Button>
          )}
        </div>
        <ExpensesTable expenses={expenses} onRefund={(expense) => openRefundDialog(expense, 'expense')} />
      </section>

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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-xl font-semibold">Daftar Penjualan</h3>
          {session?.status === 'open' && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={salePreset.channelType === 'offline' && salePreset.paymentMethod === 'cash' ? 'default' : 'outline'}
                className={salePreset.channelType === 'offline' && salePreset.paymentMethod === 'cash' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setSalePreset({ channelType: 'offline', platform: '', paymentMethod: 'cash' })}
              >
                Offline Cash
              </Button>
              <Button
                type="button"
                variant={salePreset.channelType === 'offline' && salePreset.paymentMethod === 'qris' ? 'default' : 'outline'}
                className={salePreset.channelType === 'offline' && salePreset.paymentMethod === 'qris' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setSalePreset({ channelType: 'offline', platform: '', paymentMethod: 'qris' })}
              >
                Offline QRIS
              </Button>
              <Button
                type="button"
                variant={salePreset.channelType === 'online' && salePreset.platform === 'shopeefood' ? 'default' : 'outline'}
                className={salePreset.channelType === 'online' && salePreset.platform === 'shopeefood' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setSalePreset({ channelType: 'online', platform: 'shopeefood', paymentMethod: 'qris' })}
              >
                ShopeeFood
              </Button>
              <Button
                type="button"
                variant={salePreset.channelType === 'online' && salePreset.platform === 'gofood' ? 'default' : 'outline'}
                className={salePreset.channelType === 'online' && salePreset.platform === 'gofood' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setSalePreset({ channelType: 'online', platform: 'gofood', paymentMethod: 'qris' })}
              >
                GoFood
              </Button>
              <Button
                type="button"
                variant={salePreset.paymentMethod === 'split' ? 'default' : 'outline'}
                className={salePreset.paymentMethod === 'split' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setSalePreset({ channelType: 'offline', platform: '', paymentMethod: 'split' })}
              >
                Split
              </Button>
            </div>
          )}
        </div>
        {session?.status === 'open' && (
          <BatchSaleForm
            onSubmit={handleBatchSaleSubmit}
            sessionId={sessionId}
            outletId={outletId}
            initialChannelType={salePreset.channelType}
            initialPlatform={salePreset.platform}
            initialPaymentMethod={salePreset.paymentMethod}
            inline
          />
        )}
        <SalesTable sales={sales} onRefund={(sale) => openRefundDialog(sale, 'sale')} withCard={false} />
      </section>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Pengeluaran Hari Ini</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            key={expenseFormKey}
            onSubmit={async (data) => {
              await handleExpenseSubmit(data);
            }}
          />
          <DialogFooter />
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Refund {refundKind === 'sale' ? 'Penjualan' : 'Pengeluaran'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-white p-3 text-sm text-gray-700 dark:bg-slate-700">
              Refund partial didukung. Isi nominal sesuai yang benar-benar dibalik, bukan harus full.
            </div>

            <div>
              <Label>Nominal refund</Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label>Alasan refund</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Contoh: pesanan dibatalkan, barang rusak, input salah"
              />
            </div>

            <div>
              <Label>Reference refund</Label>
              <Input
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                placeholder="Opsional"
              />
            </div>

            <div>
              <Label>Tanggal refund</Label>
              <Input
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Catatan tambahan</Label>
              <Textarea
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Opsional"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={submitRefund} className="bg-red-600 hover:bg-red-700">
                Proses Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}