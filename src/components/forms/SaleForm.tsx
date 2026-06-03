'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SaleFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
  initialChannelType?: 'offline' | 'online';
  initialPlatform?: 'shopeefood' | 'gofood' | '';
  initialPaymentMethod?: 'cash' | 'qris' | 'split';
}

export function SaleForm({
  onSubmit,
  loading = false,
  initialChannelType = 'offline',
  initialPlatform = '',
  initialPaymentMethod = 'cash',
}: SaleFormProps) {
  const [channelType, setChannelType] = useState<'offline' | 'online'>(initialChannelType);
  const [platform, setPlatform] = useState<'shopeefood' | 'gofood' | ''>(initialPlatform);
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>(initialPaymentMethod === 'split' ? 'split' : 'single');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>(initialPaymentMethod === 'qris' ? 'qris' : 'cash');
  const [grossAmount, setGrossAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'settled' | 'pending'>('settled');
  const [settlementDate, setSettlementDate] = useState('');
  const [paymentEntries, setPaymentEntries] = useState<Array<{
    id: string;
    payment_method: 'cash' | 'qris' | 'bank_transfer' | 'pending';
    amount: string;
    payment_status: 'settled' | 'pending';
    settlement_date: string;
    payment_reference: string;
    notes: string;
  }>>([
    {
      id: String(Date.now()),
      payment_method: 'cash',
      amount: '0',
      payment_status: 'settled',
      settlement_date: '',
      payment_reference: '',
      notes: '',
    },
  ]);

  useEffect(() => {
    setChannelType(initialChannelType);
    setPlatform(initialPlatform);
    setPaymentMode(initialPaymentMethod === 'split' ? 'split' : 'single');
    setPaymentMethod(initialPaymentMethod === 'qris' ? 'qris' : 'cash');
  }, [initialChannelType, initialPlatform, initialPaymentMethod]);

  useEffect(() => {
    if (paymentMode === 'split' && paymentEntries.length < 2) {
      setPaymentEntries((prev) => {
        if (prev.length >= 2) return prev;
        return [
          ...prev,
          {
            id: String(Date.now() + Math.random()),
            payment_method: 'qris',
            amount: '0',
            payment_status: 'settled',
            settlement_date: '',
            payment_reference: '',
            notes: '',
          },
        ];
      });
    }
  }, [paymentMode, paymentEntries.length]);

  const platformFee =
    platform === 'shopeefood'
      ? parseFloat(grossAmount) * 0.2
      : platform === 'gofood'
      ? parseFloat(grossAmount) * 0.25
      : 0;
  const netAmount = parseFloat(grossAmount) - platformFee;
  const splitPaymentTotal = paymentEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const splitPaymentRemaining = parseFloat(grossAmount) - splitPaymentTotal;

  function addPaymentEntry() {
    setPaymentEntries((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        payment_method: 'cash',
        amount: '0',
        payment_status: 'settled',
        settlement_date: '',
        payment_reference: '',
        notes: '',
      },
    ]);
  }

  function updatePaymentEntry(id: string, patch: Partial<(typeof paymentEntries)[number]>) {
    setPaymentEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removePaymentEntry(id: string) {
    setPaymentEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedGrossAmount = parseFloat(grossAmount);
    if (paymentMode === 'split') {
      if (paymentEntries.length < 2) {
        alert('Split payment butuh minimal 2 baris pembayaran');
        return;
      }

      if (Math.abs(splitPaymentTotal - normalizedGrossAmount) > 0.01) {
        alert('Total split payment harus sama dengan jumlah kotor');
        return;
      }
    }

    await onSubmit({
      channel_type: channelType,
      platform: channelType === 'online' ? platform || null : null,
      channel: channelType === 'offline' ? 'offline' : platform || 'offline',
      payment_method: paymentMode === 'split' ? 'split' : paymentMethod,
      gross_amount: normalizedGrossAmount,
      platform_fee: platformFee,
      net_amount: netAmount,
      payment_status: paymentMode === 'split' ? (paymentEntries.every((entry) => entry.payment_status === 'settled') ? 'settled' : 'pending') : paymentStatus,
      settlement_date: paymentMode === 'split' ? null : settlementDate || null,
      payment_entries:
        paymentMode === 'split'
          ? paymentEntries.map((entry) => ({
              payment_method: entry.payment_method,
              amount: Number(entry.amount || 0),
              payment_status: entry.payment_status,
              settlement_date: entry.settlement_date || null,
              payment_reference: entry.payment_reference || null,
              notes: entry.notes || null,
            }))
          : [
              {
                payment_method: paymentMethod,
                amount: normalizedGrossAmount,
                payment_status: paymentStatus,
                settlement_date: settlementDate || null,
                payment_reference: null,
                notes,
              },
            ],
      notes,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Penjualan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6 items-start">
            <div>
              <Label htmlFor="channel_type">Jenis Channel</Label>
              <Select value={channelType} onValueChange={(value) => setChannelType(value as 'offline' | 'online')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment_method">Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {channelType === 'online' && (
            <div>
              <Label htmlFor="platform">Platform Online</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as 'shopeefood' | 'gofood' | '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopeefood">ShopeeFood</SelectItem>
                  <SelectItem value="gofood">GoFood</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="gross_amount">Jumlah Kotor (Rp)</Label>
            <Input
              id="gross_amount"
              type="number"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_mode">Mode Pembayaran</Label>
            <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as 'single' | 'split')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Satu Metode</SelectItem>
                <SelectItem value="split">Split Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6 rounded-lg border bg-white p-4 dark:bg-slate-700 items-start">
            <div>
              <p className="text-xs text-gray-600">Jumlah Bersih</p>
              <p className="font-semibold">Rp {netAmount.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Persentase Fee</p>
              <p className="font-semibold">{platform === 'shopeefood' ? '20%' : platform === 'gofood' ? '25%' : '0%'}</p>
            </div>
          </div>

          {paymentMode === 'single' ? (
            <div className="grid grid-cols-2 gap-6 items-start">
              <div>
                <Label htmlFor="payment_method">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'qris')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_status">Status Pembayaran</Label>
                <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as 'settled' | 'pending')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="settled">Settled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border p-4 bg-white dark:bg-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Split Payment</p>
                  <p className="text-sm text-gray-500">Jumlah split harus sama dengan jumlah kotor.</p>
                </div>
                <Button type="button" variant="outline" onClick={addPaymentEntry}>
                  Tambah Baris Bayar
                </Button>
              </div>

              {paymentEntries.map((entry, index) => (
                <div key={entry.id} className="grid grid-cols-12 gap-2 items-start rounded border bg-white p-3">
                  <div className="col-span-2">
                    <Label>Metode</Label>
                    <Select
                      value={entry.payment_method}
                      onValueChange={(value) => updatePaymentEntry(entry.id, { payment_method: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Jumlah</Label>
                    <Input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => updatePaymentEntry(entry.id, { amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Status</Label>
                    <Select
                      value={entry.payment_status}
                      onValueChange={(value) => updatePaymentEntry(entry.id, { payment_status: value as 'settled' | 'pending' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="settled">Settled</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Settlement</Label>
                    <Input
                      type="date"
                      value={entry.settlement_date}
                      onChange={(e) => updatePaymentEntry(entry.id, { settlement_date: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Ref / Catatan</Label>
                    <Input
                      value={entry.payment_reference}
                      onChange={(e) => updatePaymentEntry(entry.id, { payment_reference: e.target.value })}
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => removePaymentEntry(entry.id)} disabled={paymentEntries.length <= 1}>
                      Hapus
                    </Button>
                  </div>
                  <div className="col-span-12">
                    <Label>Catatan Baris</Label>
                    <Textarea
                      value={entry.notes}
                      onChange={(e) => updatePaymentEntry(entry.id, { notes: e.target.value })}
                      placeholder={`Baris ${index + 1}`}
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                <span>Jumlah split</span>
                <span className={Math.abs(splitPaymentRemaining) > 0.01 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                  Rp {splitPaymentTotal.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                <span>Sisa</span>
                <span className={Math.abs(splitPaymentRemaining) > 0.01 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                  Rp {splitPaymentRemaining.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {paymentMode === 'single' && (
            <div>
              <Label htmlFor="settlement_date">Tanggal Settlement</Label>
              <Input
                id="settlement_date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button disabled={loading} type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? 'Memproses...' : 'Simpan Penjualan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}