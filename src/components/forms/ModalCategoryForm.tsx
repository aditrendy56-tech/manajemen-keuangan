'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ModalItem } from '@/types';

interface ModalCategoryFormProps {
  investorId: string;
  investorName: string;
  onSuccess?: () => void;
}

export default function ModalCategoryForm({ investorId, investorName, onSuccess }: ModalCategoryFormProps) {
  const [category, setCategory] = useState<'peralatan' | 'bahan_awal' | 'rencana_tambahan'>('peralatan');
  const [items, setItems] = useState<ModalItem[]>([
    { name: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const outletId = '660e8400-e29b-41d4-a716-446655440000'; // Demo outlet

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'quantity') item.quantity = parseInt(value) || 0;
    if (field === 'unit_price') item.unit_price = parseFloat(value) || 0;
    if (field === 'name') item.name = value;
    if (field === 'condition') item.condition = value;
    
    // Auto calculate total_price
    item.total_price = item.quantity * item.unit_price;
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.some(item => !item.name.trim())) {
      setError('Semua item harus memiliki nama');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          investor_id: investorId,
          date: new Date().toISOString().split('T')[0],
          category,
          amount: getTotalAmount(),
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            condition: item.condition
          })),
          notes,
          source_type: 'investor'
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal menambahkan modal');
      }

      setSuccess(true);
      setCategory('peralatan');
      setItems([{ name: '', quantity: 1, unit_price: 0, total_price: 0 }]);
      setNotes('');
      
      setTimeout(() => setSuccess(false), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels = {
    peralatan: '🔧 Peralatan',
    bahan_awal: '🛒 Bahan Awal',
    rencana_tambahan: '📋 Rencana Tambahan'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Modal - {investorName}</CardTitle>
        <CardDescription>Tambahkan modal per kategori dengan detail barang</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <Alert className="bg-red-50 border-red-200"><AlertDescription className="text-red-700">{error}</AlertDescription></Alert>}
          {success && <Alert className="bg-green-50 border-green-200"><AlertDescription className="text-green-700">✓ Modal berhasil ditambahkan</AlertDescription></Alert>}

          {/* Category Selection */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="category">Kategori Modal</Label>
              <select value={category} onChange={(e: any) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500">
                <option value="peralatan">🔧 Peralatan</option>
                <option value="bahan_awal">🛒 Bahan Awal</option>
                <option value="rencana_tambahan">📋 Rencana Tambahan</option>
              </select>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Detail Barang</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                + Tambah Barang
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Nama Barang</Label>
                    <Input
                      placeholder="Contoh: Kompor, Wajan, dll"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Kondisi</Label>
                    <select 
                      value={item.condition || ''} 
                      onChange={(e) => updateItem(index, 'condition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
                    >
                      <option value="">-- Pilih Kondisi --</option>
                      <option value="baik">Baik</option>
                      <option value="rusak">Rusak</option>
                      <option value="habis">Habis</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Harga Satuan (Rp)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Total (Rp)</Label>
                    <div className="mt-1 px-3 py-2 border rounded-md bg-white font-semibold text-orange-600">
                      {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(item.total_price || 0)}
                    </div>
                  </div>
                </div>

                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    Hapus Barang
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-orange-900">Total Modal Kategori:</span>
              <span className="text-2xl font-bold text-orange-600">
                Rp {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(getTotalAmount())}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Catatan (Optional)</Label>
            <textarea
              id="notes"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Menyimpan...' : 'Simpan Modal Kategori'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
