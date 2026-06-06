'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useOutlet } from '@/lib/context/OutletContext';

interface Investor {
  id: string;
  name: string;
  status: string;
}

interface ExpenseFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function ExpenseForm({ onSubmit, loading = false }: ExpenseFormProps) {
  const { outletId } = useOutlet();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string | null>('operasional');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'bank_transfer' | 'pending'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [settlementDate, setSettlementDate] = useState('');
  const [fundingSource, setFundingSource] = useState<'kas' | 'modal'>('kas');
  const [fundedByInvestorId, setFundedByInvestorId] = useState<string>('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch investors (for modal funding)
  useEffect(() => {
    if (!outletId) return;
    
    async function fetchInvestors() {
      try {
        setLoadingData(true);
        const res = await fetch(`/api/investors?outlet_id=${outletId}`);
        if (res.ok) {
          const data = await res.json();
          setInvestors(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching investors:', error);
      } finally {
        setLoadingData(false);
      }
    }
    
    fetchInvestors();
  }, [outletId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // VALIDATION: Description required, min 3 chars
    if (!description || description.trim().length < 3) {
      alert('Deskripsi harus minimal 3 karakter');
      return;
    }

    // VALIDATION: If modal, investor required
    if (fundingSource === 'modal' && !fundedByInvestorId) {
      alert('Pilih investor untuk pengeluaran dari modal');
      return;
    }

    try {
      const formData: any = {
        date,
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        settlement_date: settlementDate || null,
        notes,
        funding_source: fundingSource,
        funded_by_investor_id: fundingSource === 'modal' ? fundedByInvestorId : null,
      };

      await onSubmit(formData);
      
      // Reset form setelah submit sukses
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('operasional');
      setDescription('');
      setAmount('0');
      setNotes('');
      setSettlementDate('');
      setFundingSource('kas');
      setFundedByInvestorId('');
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
              <Label htmlFor="category">Kategori</Label>
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

          <div className="grid gap-6 md:grid-cols-2 items-start">
            <div>
              <Label htmlFor="funding_source">Sumber Dana *</Label>
              <Select value={fundingSource} onValueChange={(value) => setFundingSource(value as 'kas' | 'modal')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kas">Dari Kas (Penjualan)</SelectItem>
                  <SelectItem value="modal">Dari Modal (Investor)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fundingSource === 'modal' && (
              <div>
                <Label htmlFor="investor">Investor *</Label>
                <Select value={fundedByInvestorId} onValueChange={setFundedByInvestorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingData ? 'Loading...' : 'Pilih investor'}>
                      {fundedByInvestorId && investors.find((inv) => inv.id === fundedByInvestorId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {investors.length > 0 ? (
                      investors.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_empty" disabled>Tidak ada investor</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button disabled={loading || loadingData} type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? 'Memproses...' : 'Simpan Pengeluaran'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}