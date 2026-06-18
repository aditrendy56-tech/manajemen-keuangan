'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/types';

interface CustomPricingEntry {
  product_id: string;
  product_name: string;
  quantity: number;
  original_price: number;
  original_total: number;
  custom_price: number;
  discount_amount: number;
  discount_percentage: string;
  description: string;
  created_at?: string;
}

interface CustomPricingTabProps {
  sessionId: string;
  outletId: string;
  onSubmit: (entries: CustomPricingEntry[]) => void;
  isLoading?: boolean;
}

export function CustomPricingTab({ sessionId, outletId, onSubmit, isLoading = false }: CustomPricingTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<CustomPricingEntry[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customPrice, setCustomPrice] = useState('');
  const [discountAmountInput, setDiscountAmountInput] = useState('');
  const [discountPercentageInput, setDiscountPercentageInput] = useState('');
  const [description, setDescription] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`/api/products?outlet_id=${outletId}`);
        if (!res.ok) throw new Error('Gagal memuat produk');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        console.error('Error fetching products:', err);
        setError('Gagal memuat daftar produk');
      } finally {
        setLoadingProducts(false);
      }
    }

    if (outletId) {
      fetchProducts();
    }
  }, [outletId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const originalPrice = selectedProduct?.price_offline || 0;
  const quantityNum = parseInt(quantity) || 0;
  const originalTotal = originalPrice * quantityNum;
  const customPriceNum = parseFloat(customPrice) || 0;
  const discountAmountInputNum = parseFloat(discountAmountInput) || 0;
  const discountPercentageInputNum = parseFloat(discountPercentageInput) || 0;
  const discountAmount =
    discountAmountInputNum > 0
      ? Math.min(discountAmountInputNum, originalTotal)
      : discountPercentageInputNum > 0
        ? (originalTotal * discountPercentageInputNum) / 100
        : originalTotal - customPriceNum;
  const discountPercentage = originalTotal > 0 ? ((discountAmount / originalTotal) * 100).toFixed(2) : '0';
  const finalCustomPrice = Math.max(0, originalTotal - discountAmount);

  function handleAddEntry() {
    // Validasi
    if (!selectedProductId) {
      alert('Pilih produk terlebih dahulu');
      return;
    }
    if (!quantityNum || quantityNum <= 0) {
      alert('Jumlah harus lebih dari 0');
      return;
    }
    if (!finalCustomPrice || finalCustomPrice <= 0) {
      alert('Harga custom atau diskon harus menghasilkan nilai lebih dari 0');
      return;
    }
    if (finalCustomPrice > originalTotal) {
      alert('Harga custom tidak boleh lebih besar dari harga normal');
      return;
    }
    if (!description.trim()) {
      alert('Deskripsi/alasan wajib diisi');
      return;
    }

    const newEntry: CustomPricingEntry = {
      product_id: selectedProductId,
      product_name: selectedProduct!.name,
      quantity: quantityNum,
      original_price: originalPrice,
      original_total: originalTotal,
      custom_price: finalCustomPrice,
      discount_amount: discountAmount,
      discount_percentage: discountPercentage,
      description: description.trim(),
    };

    setEntries([...entries, newEntry]);

    // Reset form
    setSelectedProductId('');
    setQuantity('1');
    setCustomPrice('');
    setDiscountAmountInput('');
    setDiscountPercentageInput('');
    setDescription('');
    setError(null);
  }

  function handleRemoveEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index));
  }

  function handleEditEntry(index: number) {
    const entry = entries[index];
    setSelectedProductId(entry.product_id);
    setQuantity(entry.quantity.toString());
    setCustomPrice(entry.custom_price.toString());
    setDescription(entry.description);
    handleRemoveEntry(index);
  }

  async function handleSubmit() {
    if (entries.length === 0) {
      alert('Tambahkan minimal 1 custom pricing');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      for (const entry of entries) {
        const res = await fetch('/api/sales/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            outlet_id: outletId,
            product_id: entry.product_id,
            quantity: entry.quantity,
            custom_price: entry.custom_price,
            custom_description: entry.description,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Gagal menambahkan custom pricing');
        }
      }

      // Success - notify parent and reset
      onSubmit(entries);
      setEntries([]);
      alert(`${entries.length} custom pricing berhasil ditambahkan`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menambahkan custom pricing';
      console.error('Error submitting custom pricing:', err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const subtotalCustom = entries.reduce((sum, e) => sum + e.custom_price, 0);
  const subtotalDiscount = entries.reduce((sum, e) => sum + e.discount_amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>💳 Harga Custom</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Input Form */}
        <div className="space-y-4 p-4 bg-gray-50 rounded border">
          <h4 className="font-semibold text-sm">Tambah Custom Pricing</h4>

          <div className="space-y-3">
            <div>
              <Label htmlFor="product-select" className="text-sm">
                Pilih Produk
              </Label>
              <select
                id="product-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={loadingProducts}
              >
                <option value="">
                  {loadingProducts ? 'Memuat produk...' : 'Pilih Produk...'}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div>
                <Label className="text-sm text-gray-600">
                  Harga Normal (Reference): Rp {originalPrice.toLocaleString('id-ID')} per item
                </Label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qty-input" className="text-sm">
                  Jumlah (Qty)
                </Label>
                <Input
                  id="qty-input"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="mt-1"
                  placeholder="1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">
                  Total Normal: Rp {originalTotal.toLocaleString('id-ID')}
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="custom-price-input" className="text-sm">
                Harga Custom (Rp)
              </Label>
              <Input
                id="custom-price-input"
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                min="0"
                step="100"
                className="mt-1"
                placeholder="Masukkan harga custom"
              />

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="discount-amount-input" className="text-sm">Diskon (Rp)</Label>
                  <Input
                    id="discount-amount-input"
                    type="number"
                    value={discountAmountInput}
                    onChange={(e) => setDiscountAmountInput(e.target.value)}
                    min="0"
                    step="100"
                    className="mt-1"
                    placeholder="Contoh: 5000"
                  />
                </div>
                <div>
                  <Label htmlFor="discount-percent-input" className="text-sm">Diskon (%)</Label>
                  <Input
                    id="discount-percent-input"
                    type="number"
                    value={discountPercentageInput}
                    onChange={(e) => setDiscountPercentageInput(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="mt-1"
                    placeholder="Contoh: 10"
                  />
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-600">
                Harga custom akan dihitung otomatis dari diskon jika kolom diskon diisi. Jika tidak, gunakan harga custom manual.
              </div>
              <div className="mt-1 text-xs text-blue-700 font-medium">
                Preview harga final: Rp {finalCustomPrice.toLocaleString('id-ID')} • Diskon: Rp {discountAmount.toLocaleString('id-ID')} ({discountPercentage}%)
              </div>
            </div>

            <div>
              <Label htmlFor="description-input" className="text-sm">
                Deskripsi / Alasan Harga Custom
              </Label>
              <Textarea
                id="description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Tetangga dekat, diskusi harga dengan owner"
                className="mt-1 min-h-[80px]"
              />
            </div>

            <Button
              onClick={handleAddEntry}
              disabled={!selectedProductId || !quantity || !customPrice || !description.trim() || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Tambah Custom Pricing
            </Button>
          </div>
        </div>

        {/* Entries List */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Daftar Custom Pricing (Sesi Ini)</h4>
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="p-3 border border-blue-200 bg-blue-50 rounded space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{entry.product_name} × {entry.quantity}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Harga Normal: Rp {entry.original_total.toLocaleString('id-ID')} → Custom: Rp{' '}
                        {entry.custom_price.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Diskon: Rp {entry.discount_amount.toLocaleString('id-ID')} ({entry.discount_percentage}%)
                      </p>
                      <p className="text-xs text-gray-700 mt-2 italic">&ldquo;{entry.description}&rdquo;</p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEntry(idx)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveEntry(idx)}
                        className="text-xs text-red-600"
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-3 bg-gray-100 rounded space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Item: {entries.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Custom Price:</span>
                <span className="font-semibold">Rp {subtotalCustom.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total Diskon Diberikan:</span>
                <span className="font-semibold">Rp {subtotalDiscount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {entries.length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={submitting || isLoading || entries.length === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {submitting ? 'Menyimpan...' : `Simpan ${entries.length} Custom Pricing`}
          </Button>
        )}

        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Belum ada custom pricing. Isi form di atas untuk menambahkan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
