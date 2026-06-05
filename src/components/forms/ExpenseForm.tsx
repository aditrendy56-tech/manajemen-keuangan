'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/card';
import { useOutlet } from '@/lib/context/OutletContext';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
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
  const [deliveryDate, setDeliveryDate] = useState('');
  const [rawMaterialId, setRawMaterialId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch materials and suppliers
  useEffect(() => {
    if (!outletId) return;
    
    async function fetchData() {
      try {
        setLoadingData(true);
        const [materialsRes, suppliersRes] = await Promise.all([
          fetch(`/api/raw-materials?outlet_id=${outletId}`),
          fetch(`/api/suppliers?outlet_id=${outletId}`),
        ]);
        
        if (materialsRes.ok) {
          const mats = await materialsRes.json();
          setMaterials(Array.isArray(mats) ? mats : []);
        }
        
        if (suppliersRes.ok) {
          const sups = await suppliersRes.json();
          setSuppliers(Array.isArray(sups) ? sups : []);
        }
      } catch (error) {
        console.error('Error fetching materials/suppliers:', error);
      } finally {
        setLoadingData(false);
      }
    }
    
    fetchData();
  }, [outletId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const formData: any = {
        date,
        category,
        description,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        settlement_date: settlementDate || null,
        notes,
      };

      // Add material fields if kategori = bahan
      if (category === 'bahan') {
        formData.raw_material_id = rawMaterialId || null;
        formData.supplier_id = supplierId || null;
        formData.delivery_date = deliveryDate || null;
      }

      await onSubmit(formData);
      
      // Reset form setelah submit sukses
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('operasional');
      setDescription('');
      setAmount('0');
      setNotes('');
      setDeliveryDate('');
      setRawMaterialId('');
      setSupplierId('');
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
                  <SelectItem value="gabungan">Gabungan (Fleksibel)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional: Bahan-specific fields */}
          {category === 'bahan' && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <Label htmlFor="rawMaterialId">Pilih Bahan</Label>
                <Select value={rawMaterialId} onValueChange={setRawMaterialId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingData ? 'Loading...' : 'Pilih bahan'} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.length > 0 ? (
                      materials.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_empty" disabled>Tidak ada bahan - silahkan input terlebih dahulu di Manajemen Bahan</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 mt-1">⚠️ Jika belum ada pilihan bahan, silahkan input terlebih dahulu di Manajemen Bahan</p>
              </div>

              <div>
                <Label htmlFor="supplierId">Supplier (Opsional)</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih supplier (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak ada supplier</SelectItem>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deliveryDate">Tanggal Pengiriman (Opsional)</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="pt-1">
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

          <Button disabled={loading || loadingData} type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? 'Memproses...' : 'Simpan Pengeluaran'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}