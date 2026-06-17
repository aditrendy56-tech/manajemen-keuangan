'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface ExpenseFormPayload {
  date: string;
  category: string | null;
  description: string;
  amount: number;
  payment_method: 'cash' | 'qris' | 'bank_transfer' | 'pending';
  payment_status: 'paid' | 'pending';
  settlement_date: string | null;
  notes: string;
  equipment_name?: string;
}

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormPayload) => Promise<void>;
  loading?: boolean;
}

export function ExpenseForm({ onSubmit, loading = false }: ExpenseFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string | null>('operasional');
  const [equipmentName, setEquipmentName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'bank_transfer' | 'pending'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [settlementDate, setSettlementDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // VALIDATION: Description required, min 3 chars
    if (!description || description.trim().length < 3) {
      alert('Deskripsi harus minimal 3 karakter');
      return;
    }

    // VALIDATION: Amount must be greater than 0
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Jumlah harus lebih dari 0');
      return;
    }

    // VALIDATION: Equipment name required for peralatan category
    if (category === 'peralatan' && (!equipmentName || equipmentName.trim().length < 3)) {
      alert('Nama alat harus minimal 3 karakter untuk kategori Peralatan');
      return;
    }

    try {
      const formData: ExpenseFormPayload = {
        date,
        category,
        description: description.trim(),
        amount: parsedAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        settlement_date: settlementDate || null,
        notes,
      };

      // Add equipment_name for peralatan category
      if (category === 'peralatan') {
        formData.equipment_name = equipmentName.trim();
      }

      await onSubmit(formData);
      
      // Reset form setelah submit sukses
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('operasional');
      setEquipmentName('');
      setDescription('');
      setAmount('0');
      setNotes('');
      setSettlementDate('');
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-8 md:grid-cols-2 items-start">
            <div>
              <Label htmlFor="date">Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="category">Kategori</Label>
                <div className="group relative">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold cursor-help">?</span>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-md p-3 w-64 z-50">
                    <div className="font-semibold mb-2">Panduan Kategori:</div>
                    <ul className="space-y-1 text-left">
                      <li><strong>Operasional:</strong> ✅ Dikurangi dari profit (gaji, listrik, air, gas)</li>
                      <li><strong>Bahan:</strong> ⚠️ Tracked saja, HPP sudah termasuk</li>
                      <li><strong>Peralatan:</strong> 📊 Asset, tracking ROI investor</li>
                    </ul>
                  </div>
                </div>
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bahan">Bahan</SelectItem>
                  <SelectItem value="operasional">Operasional</SelectItem>
                  <SelectItem value="peralatan">Peralatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {category === 'peralatan' && (
            <div className="pt-1 bg-blue-50 p-3 rounded border border-blue-200">
              <Label htmlFor="equipment_name">Nama Alat/Peralatan *</Label>
              <Input
                id="equipment_name"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="Contoh: Mixer Roti, Oven 60 Liter, dll (minimal 3 karakter)"
                required
              />
              <p className="text-xs text-blue-600 mt-1">Nama ini akan ditampilkan di halaman Manajemen Bahan tab Alat</p>
            </div>
          )}

          <div className="pt-1">
            <Label htmlFor="description">Deskripsi *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi pengeluaran (minimal 3 karakter)"
              required
            />
          </div>

          <div>
            <CurrencyInput
              label="Jumlah (Rp)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              showVisual={true}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 items-start">
            <div>
              <Label htmlFor="payment_method">Metode Bayar</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'qris' | 'bank_transfer' | 'pending')}>
                <SelectTrigger className="w-full">
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
                <SelectTrigger className="w-full">
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