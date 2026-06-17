'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface CapitalFormPayload {
  date: string;
  amount: number;
  source: string;
  notes: string;
}

interface CapitalFormProps {
  onSubmit: (data: CapitalFormPayload) => Promise<void>;
  loading?: boolean;
}

export function CapitalForm({ onSubmit, loading = false }: CapitalFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('0');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      date,
      amount: parseFloat(amount),
      source,
      notes,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Modal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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

          <div>
            <Label htmlFor="source">Sumber Modal</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Contoh: Tabungan pribadi, Pinjaman bank, dst"
            />
          </div>

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button disabled={loading} type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? 'Memproses...' : 'Simpan Modal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}