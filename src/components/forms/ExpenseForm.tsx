'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ExpenseFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function ExpenseForm({ onSubmit, loading = false }: ExpenseFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string | null>('operasional');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'bank_transfer' | 'pending'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [settlementDate, setSettlementDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await onSubmit({
        date,
        category,
        description,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        settlement_date: settlementDate || null,
        notes,
      });
      // Reset form setelah submit sukses
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('operasional');
      setDescription('');
      setAmount('0');
      setNotes('');
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Pengeluaran</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bahan_baku">Bahan Baku</SelectItem>
                  <SelectItem value="operasional">Operasional</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="peralatan">Peralatan</SelectItem>
                  <SelectItem value="lain_lain">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi pengeluaran"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Jumlah (Rp)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">Metode Bayar</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'qris' | 'bank_transfer' | 'pending')}>
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
            <div>
              <Label htmlFor="payment_status">Status Bayar</Label>
              <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as 'paid' | 'pending')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button disabled={loading} type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? 'Memproses...' : 'Simpan Pengeluaran'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}