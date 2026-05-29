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
  const [channelType, setChannelType] = useState<'offline' | 'online'>('offline');
  const [platform, setPlatform] = useState<'shopeefood' | 'gofood' | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>('cash');
  const [grossAmount, setGrossAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'settled' | 'pending'>('settled');
  const [settlementDate, setSettlementDate] = useState('');

  const platformFee =
    platform === 'shopeefood'
      ? parseFloat(grossAmount) * 0.2
      : platform === 'gofood'
      ? parseFloat(grossAmount) * 0.25
      : 0;
  const netAmount = parseFloat(grossAmount) - platformFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      channel_type: channelType,
      platform: channelType === 'online' ? platform || null : null,
      channel: channelType === 'offline' ? 'offline' : platform || 'offline',
      payment_method: paymentMethod,
      gross_amount: parseFloat(grossAmount),
      platform_fee: platformFee,
      net_amount: netAmount,
      payment_status: paymentStatus,
      settlement_date: settlementDate || null,
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
              <p className="font-semibold">{platform === 'shopeefood' ? '20%' : platform === 'gofood' ? '25%' : '0%'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="settlement_date">Tanggal Settlement</Label>
              <Input
                id="settlement_date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
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