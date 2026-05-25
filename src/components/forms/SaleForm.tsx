'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SaleFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function SaleForm({ onSubmit, loading = false }: SaleFormProps) {
  const [channel, setChannel] = useState<string | null>('offline');
  const [paymentMethod, setPaymentMethod] = useState<string | null>('cash');
  const [grossAmount, setGrossAmount] = useState('0');
  const [notes, setNotes] = useState('');

  const platformFee =
    channel === 'shopeefood'
      ? parseFloat(grossAmount) * 0.2
      : channel === 'gofood'
      ? parseFloat(grossAmount) * 0.25
      : 0;
  const netAmount = parseFloat(grossAmount) - platformFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      channel,
      payment_method: paymentMethod,
      gross_amount: parseFloat(grossAmount),
      platform_fee: platformFee,
      net_amount: netAmount,
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="shopeefood">ShopeeFood</SelectItem>
                  <SelectItem value="gofood">GoFood</SelectItem>
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

          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
            <div>
              <p className="text-xs text-gray-600">Biaya Platform</p>
              <p className="font-semibold">Rp {platformFee.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Jumlah Bersih</p>
              <p className="font-semibold">Rp {netAmount.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Persentase Fee</p>
              <p className="font-semibold">{channel === 'offline' ? '0%' : channel === 'shopeefood' ? '20%' : '25%'}</p>
            </div>
          </div>

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