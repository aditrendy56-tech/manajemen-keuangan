'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ItemRow {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface BatchSaleFormProps {
  onSubmit: (payload: any) => Promise<void>;
  sessionId?: string | null;
  outletId?: string | null;
}

export function BatchSaleForm({ onSubmit, sessionId, outletId }: BatchSaleFormProps) {
  const [channelType, setChannelType] = useState<'offline' | 'online'>('offline');
  const [platform, setPlatform] = useState<'shopeefood' | 'gofood' | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'settled' | 'pending'>('settled');
  const [settlementDate, setSettlementDate] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { id: String(Date.now()), product_name: '', quantity: 1, unit_price: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  function addRow() {
    setItems((s) => [...s, { id: String(Date.now() + Math.random()), product_name: '', quantity: 1, unit_price: 0 }]);
  }

  function updateRow(id: string, patch: Partial<ItemRow>) {
    setItems((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setItems((s) => s.filter((r) => r.id !== id));
  }

  const grossAmount = items.reduce((sum, it) => sum + it.quantity * Number(it.unit_price || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        session_id: sessionId || null,
        outlet_id: outletId || null,
        channel_type: channelType,
        platform: channelType === 'online' ? platform || null : null,
        channel: channelType === 'offline' ? 'offline' : platform || 'offline',
        payment_method: paymentMethod,
        gross_amount: grossAmount,
        payment_status: paymentStatus,
        settlement_date: settlementDate || null,
        items: items.map((it) => ({ product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price })),
      };
      await onSubmit(payload);
      // reset
      setItems([{ id: String(Date.now()), product_name: '', quantity: 1, unit_price: 0 }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Penjualan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Jenis Channel</Label>
              <Select value={channelType} onValueChange={(v) => setChannelType(v as 'offline' | 'online')}>
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
              <Label>Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
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
              <Label>Platform Online</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as 'shopeefood' | 'gofood' | '')}>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status Pembayaran</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'settled' | 'pending')}>
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
              <Label>Tanggal Settlement</Label>
              <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            {items.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label>Produk / Nama</Label>
                  <Input value={row.product_name} onChange={(e) => updateRow(row.id, { product_name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Qty</Label>
                  <Input type="number" value={String(row.quantity)} onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-3">
                  <Label>Harga / Unit</Label>
                  <Input type="number" value={String(row.unit_price)} onChange={(e) => updateRow(row.id, { unit_price: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 flex gap-2">
                  <div>
                    <Label>&nbsp;</Label>
                    <Button type="button" variant="ghost" onClick={() => removeRow(row.id)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button type="button" onClick={addRow} variant="outline">
              Tambah Baris
            </Button>
          </div>

          <div className="pt-2">
            <p className="text-sm text-gray-600">Jumlah Kotor: Rp {grossAmount.toLocaleString('id-ID')}</p>
          </div>

          <div>
            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
              {loading ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default BatchSaleForm;
