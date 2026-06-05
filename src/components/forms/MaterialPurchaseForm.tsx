'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface MaterialPurchaseFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function MaterialPurchaseForm({ onSubmit, loading = false }: MaterialPurchaseFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');
  const [notes, setNotes] = useState('');

  const totalAmount = parseFloat(quantity) * parseFloat(unitPrice);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      date,
      quantity: parseFloat(quantity),
      unit_price: parseFloat(unitPrice),
      total_amount: totalAmount,
      notes,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Pembelian Bahan Baku</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-6 items-start">
            <div>
              <Label htmlFor="quantity">Jumlah</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <CurrencyInput
                label="Harga per Unit (Rp)"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0"
                required
                showVisual={true}
              />
            </div>
          </div>

          <div className="p-4 bg-white rounded border border-orange-200 dark:bg-slate-700">
            <p className="text-sm text-gray-600 dark:text-slate-300">Total</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">Rp {totalAmount.toLocaleString('id-ID')}</p>
          </div>

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button disabled={loading} type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? 'Memproses...' : 'Simpan Pembelian'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}