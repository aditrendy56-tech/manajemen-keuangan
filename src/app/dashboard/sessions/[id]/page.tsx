 'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SalesTable } from '@/components/tables/SalesTable';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { OnlineSalesReport } from '@/components/dashboard/OnlineSalesReport';
import { Sale, Expense, DailySession, MaterialPurchase } from '@/types';
import { useParams } from 'next/navigation';
import { useOutlet } from '@/lib/context/OutletContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BatchSaleForm from '@/components/forms/BatchSaleForm';
import { AlertCircle } from 'lucide-react';

type ExpenseSessionRecord = Expense & {
  sessions?: {
    date?: string | null;
  } | null;
};

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
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundKind, setRefundKind] = useState<'sale' | 'expense'>('sale');
  const [refundTarget, setRefundTarget] = useState<Sale | Expense | null>(null);
  const [refundAmount, setRefundAmount] = useState('0');
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundNotes, setRefundNotes] = useState('');

  async function loadData(sessionDate?: string) {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    if (!outletId) {
      setSales([]);
      setExpenses([]);
      setPurchases([]);
      setLoading(false);
      return;
    }

    try {
      const dateQuery = sessionDate ? `&date=${encodeURIComponent(sessionDate)}` : '';
      const [salesResult, expensesResult, purchasesResult] = await Promise.all([
        fetch(`/api/sales?outlet_id=${outletId}&session_id=${sessionId}&limit=500`)
          .then(async (res) => {
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          })
          .catch((e) => {
            console.warn('Failed to fetch sales:', e);
            return [];
          }),
        fetch(`/api/expenses?outlet_id=${outletId}&session_id=${sessionId}${dateQuery}&limit=500`)
          .then(async (res) => {
            if (!res.ok) return [];
            const data = await res.json();
            const sourceExpenses = Array.isArray(data) ? data : [];
            return sessionDate
              ? sourceExpenses.filter((exp: ExpenseSessionRecord) => {
                  return exp.date === sessionDate || exp.sessions?.date === sessionDate;
                })
              : sourceExpenses;
          })
          .catch((e) => {
            console.warn('Failed to fetch expenses:', e);
            return [];
          }),
        fetch(`/api/material-purchases?outlet_id=${outletId}&session_id=${sessionId}`)
          .then(async (res) => {
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          })
          .catch((e) => {
            console.warn('Failed to fetch material purchases:', e);
            return [];
          }),
      ]);

      setSales(salesResult);
      setExpenses(expensesResult);
      setPurchases(purchasesResult);
    } catch (e) {
      console.warn('Failed to load session detail data:', e);
      setSales([]);
      setExpenses([]);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      setError(null);
      try {
        const sessionRes = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionRes.ok) throw new Error('Failed to fetch session');
        const sessionData = await sessionRes.json();
        setSession(sessionData || null);

        await loadData(sessionData?.date);
      } catch (err: any) {
        console.error('Error loading session detail:', err);
        setError(err.message || 'Failed to load data');
        setSales([]);
        setExpenses([]);
        setPurchases([]);
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



  function openRefundDialog(target: Sale | Sale[] | Expense, kind: 'sale' | 'expense') {
    // Check if it's batch refund (array of sales)
    if (Array.isArray(target)) {
      const totalAmount = target.reduce((sum, s) => sum + (s.net_amount || 0), 0);
      setRefundKind('sale');
      setRefundTarget(null); // Will handle batch separately
      setRefundAmount(String(totalAmount));
      setRefundReason('');
      setRefundReference(`batch-refund-${Date.now()}`);
      setRefundDate(new Date().toISOString().split('T')[0]);
      setRefundNotes(`Batch refund untuk ${target.length} transaksi`);
      
      // Store selected sales temporarily
      (window as any).__batchRefundSales = target;
      setRefundDialogOpen(true);
    } else {
      // Single refund
      const defaultAmount = kind === 'sale' ? Number((target as Sale).net_amount || 0) : Number((target as Expense).amount || 0);
      setRefundKind(kind);
      setRefundTarget(target);
      setRefundAmount(String(defaultAmount));
      setRefundReason('');
      setRefundReference(`${target.id}-refund`);
      setRefundDate(new Date().toISOString().split('T')[0]);
      setRefundNotes('');
      (window as any).__batchRefundSales = null;
      setRefundDialogOpen(true);
    }
  }

  async function submitRefund() {
    const batchRefundSales = (window as any).__batchRefundSales;

    if (!refundReason.trim()) {
      alert('Alasan refund wajib diisi');
      return;
    }

    if (!refundAmount || Number(refundAmount) <= 0) {
      alert('Nominal refund harus lebih dari 0');
      return;
    }

    // Handle batch refund
    if (batchRefundSales && Array.isArray(batchRefundSales)) {
      const totalAmount = batchRefundSales.reduce((sum: number, s: Sale) => sum + (s.net_amount || 0), 0);
      const amountToRefund = Number(refundAmount || 0);

      if (amountToRefund > totalAmount) {
        alert('Nominal refund tidak boleh melebihi nominal total');
        return;
      }

      try {
        for (const sale of batchRefundSales) {
          const response = await fetch(`/api/sales/${sale.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payment_status: 'refunded',
              refund_amount: sale.net_amount,
              refund_reason: refundReason,
              refunded_at: refundDate,
              refund_reference: refundReference || `batch-refund-${Date.now()}`,
              notes: refundNotes || `Batch refund - ${refundReason}`,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Gagal refund untuk ${sale.id}`);
          }

          const updated = await response.json();
          setSales((prev) => prev.map((item) => (item.id === sale.id ? updated : item)));
        }

        setRefundDialogOpen(false);
        setRefundTarget(null);
        (window as any).__batchRefundSales = null;
        alert(`${batchRefundSales.length} transaksi berhasil direfund`);
      } catch (error: any) {
        alert('Gagal refund: ' + (error.message || error));
      }
    } else if (refundTarget) {
      // Single refund
      const endpoint = refundKind === 'sale' ? `/api/sales/${refundTarget.id}` : `/api/expenses/${refundTarget.id}`;
      const originalAmount = refundKind === 'sale' ? Number((refundTarget as Sale).net_amount || 0) : Number((refundTarget as Expense).amount || 0);
      const amountToRefund = Number(refundAmount || 0);

      if (amountToRefund > originalAmount) {
        alert('Nominal refund tidak boleh melebihi nominal asli');
        return;
      }

      try {
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
        alert('Refund berhasil diproses');
      } catch (error: any) {
        alert('Gagal refund: ' + (error.message || error));
      }
    }
  }

  async function handleDeleteSale(saleId: string) {
    if (!confirm('Hapus penjualan ini? Data akan hilang selamanya.')) return;

    try {
      console.log('[SESSION] Deleting sale:', saleId);
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SESSION] Delete failed:', errorData);
        throw new Error(errorData.error || 'Gagal menghapus');
      }

      await loadData(session?.date);
      alert('✅ Penjualan berhasil dihapus');
    } catch (err: any) {
      console.error('[SESSION] Delete error:', err);
      alert(`Gagal hapus: ${err.message || err}\n\nHubungi admin jika masalah berlanjut.`);
    }
  }

  async function handleDeleteSaleItems(itemIds: string[]) {
    if (!itemIds || itemIds.length === 0) return;
    if (!confirm('Hapus item penjualan terpilih? Data akan hilang selamanya.')) return;

    try {
      console.log('[SESSION] Deleting sale items:', itemIds);
      const response = await fetch(`/api/sale-items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds }),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          console.error('[SESSION] Delete items non-JSON response:', response.status, text);
          throw new Error(`Gagal menghapus item (status ${response.status})`);
        }

        console.error('[SESSION] Delete items failed:', response.status, errorData);
        throw new Error(errorData?.error || `Gagal menghapus item (status ${response.status})`);
      }

      await loadData(session?.date);
      alert('✅ Item penjualan berhasil dihapus');
    } catch (err: any) {
      console.error('[SESSION] Delete item error:', err);
      alert(`Gagal hapus item: ${err.message || err}\n\nHubungi admin jika masalah berlanjut.`);
    }
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

  const totalSales = sales.reduce((sum, s) => sum + getRecognizedSaleAmount(s), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + getRecognizedExpenseAmount(e), 0);
  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + (purchase.total_amount || Number(purchase.quantity) * Number(purchase.unit_price)),
    0
  );
  const expectedClosing = (session?.opening_cash || 0) + totalSales - totalExpenses - totalPurchases;
  const closingDifference = Number(closingCash || 0) - expectedClosing;

  async function handleCloseSession() {
    const enteredClosingCash = Number(closingCash || 0);

    if (!closingCash || !Number.isFinite(enteredClosingCash) || enteredClosingCash <= 0) {
      alert('Masukkan jumlah cash penutupan yang valid');
      return;
    }

    if (!sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed', closing_cash: enteredClosingCash }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to close session');
      }

      const updated = await res.json();
      setSession(updated.session || updated);
      setClosingCash('');
      alert('Sesi berhasil ditutup. Selisih cash: Rp ' + (enteredClosingCash - expectedClosing).toLocaleString('id-ID'));
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
              <p className="mt-2 text-xs text-slate-500">
                Perkiraan cash akhir dari laporan: Rp {expectedClosing.toLocaleString('id-ID')}
              </p>
              {closingCash && (
                <p className={closingDifference === 0 ? 'mt-1 text-xs text-green-600' : 'mt-1 text-xs text-red-600'}>
                  Selisih: Rp {Math.abs(closingDifference).toLocaleString('id-ID')} {closingDifference >= 0 ? 'lebih' : 'kurang'} dari laporan
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Daftar Pengeluaran</h3>
        
        {/* Info banner directing users to Pengeluaran page */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            💡 <strong>Catatan:</strong> Untuk input pengeluaran baru, gunakan halaman <strong>Pengeluaran</strong> di menu utama.
            Pengeluaran akan otomatis muncul di sini jika tanggalnya sesuai dengan hari sesi.
          </p>
        </div>
        
        <ExpensesTable expenses={expenses} />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Input Penjualan</h3>

        {session?.status === 'open' && (
          <BatchSaleForm
            onSubmit={handleBatchSaleSubmit}
            sessionId={sessionId}
            outletId={outletId}
          />
        )}

        <div className="pt-8 mt-4">
          <div className="flex items-center gap-3 py-4">
            <div className="h-px flex-1 bg-slate-300" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-slate-800">Laporan Penjualan Hari Ini</h3>
            <div className="h-px flex-1 bg-slate-300" />
          </div>
          <SalesTable
            sales={sales}
            onRefund={(sale) => openRefundDialog(sale, 'sale')}
            onDelete={handleDeleteSale}
            onDeleteItems={handleDeleteSaleItems}
            withCard={false}
          />
        </div>
      </section>

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