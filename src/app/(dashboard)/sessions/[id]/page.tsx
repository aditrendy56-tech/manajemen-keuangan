'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SalesTable } from '@/components/tables/SalesTable';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Sale, Expense, DailySession } from '@/types';
import { useParams } from 'next/navigation';

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params?.id as string;

  // Mock data
  const session: DailySession = {
    id: sessionId,
    outlet_id: 'outlet-1',
    date: new Date().toISOString().split('T')[0],
    opening_cash: 500000,
    closing_cash: null,
    status: 'open',
    notes: 'Sesi hari ini',
    created_at: new Date().toISOString(),
  };

  const sales: Sale[] = [
    {
      id: '1',
      session_id: sessionId,
      outlet_id: 'outlet-1',
      channel: 'offline',
      payment_method: 'cash',
      gross_amount: 100000,
      platform_fee: 0,
      net_amount: 100000,
      order_ref: undefined,
      notes: undefined,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      session_id: sessionId,
      outlet_id: 'outlet-1',
      channel: 'shopeefood',
      payment_method: 'qris',
      gross_amount: 150000,
      platform_fee: 30000,
      net_amount: 120000,
      order_ref: 'SHP123',
      notes: undefined,
      created_at: new Date().toISOString(),
    },
  ];

  const expenses: Expense[] = [
    {
      id: '1',
      session_id: sessionId,
      outlet_id: 'outlet-1',
      date: new Date().toISOString().split('T')[0],
      category: 'operasional',
      description: 'Biaya listrik',
      amount: 50000,
      created_at: new Date().toISOString(),
    },
  ];

  const [closingCash, setClosingCash] = useState('');

  const totalSales = sales.reduce((sum, s) => sum + s.net_amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expectedClosing = session.opening_cash + totalSales - totalExpenses;

  async function handleCloseSession() {
    if (!closingCash) {
      alert('Masukkan jumlah cash penutupan');
      return;
    }
    // TODO: Call API to close session
    alert('Sesi ditutup. Selisih: Rp ' + (parseInt(closingCash) - expectedClosing).toLocaleString('id-ID'));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Detail Sesi</h1>
        <p className="text-gray-600">Sesi pada {session.date}</p>
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
              <p className="text-lg font-semibold">Rp {session.opening_cash.toLocaleString('id-ID')}</p>
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

          {session.status === 'open' && (
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