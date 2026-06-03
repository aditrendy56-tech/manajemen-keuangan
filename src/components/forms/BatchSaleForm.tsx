'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ItemRow {
  id: string;
  product_name: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
}

interface BatchSaleFormProps {
  onSubmit: (payload: any) => Promise<void>;
  sessionId?: string | null;
  outletId?: string | null;
  initialChannelType?: 'offline' | 'online';
  initialPlatform?: 'shopeefood' | 'gofood' | '';
  initialPaymentMethod?: 'cash' | 'qris' | 'split';
  inline?: boolean;
}

export function BatchSaleForm({
  onSubmit,
  sessionId,
  outletId,
  initialChannelType = 'offline',
  initialPlatform = '',
  initialPaymentMethod = 'cash',
  inline = false,
}: BatchSaleFormProps) {
  const [channelType, setChannelType] = useState<'offline' | 'online'>(initialChannelType);
  const [platform, setPlatform] = useState<'shopeefood' | 'gofood' | ''>(initialPlatform);
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>(initialPaymentMethod === 'split' ? 'split' : 'single');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>(initialPaymentMethod === 'qris' ? 'qris' : 'cash');
  const [paymentStatus, setPaymentStatus] = useState<'settled' | 'pending'>('settled');
  const [settlementDate, setSettlementDate] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; name: string; price?: number; price_offline?: number; price_shopeefood?: number; price_gofood?: number }>>([]);

  useEffect(() => {
    setChannelType(initialChannelType);
    setPlatform(initialPlatform);
    setPaymentMode(initialPaymentMethod === 'split' ? 'split' : 'single');
    setPaymentMethod(initialPaymentMethod === 'qris' ? 'qris' : 'cash');
  }, [initialChannelType, initialPlatform, initialPaymentMethod]);

  useEffect(() => {
    async function loadProducts() {
      if (!outletId) return;
      try {
        const res = await fetch(`/api/products?outlet_id=${outletId}`);
        if (!res.ok) return;
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('Failed to load products', e);
      }
    }
    loadProducts();
  }, [outletId]);

  function getProductPrice(product: { price?: number; price_offline?: number; price_shopeefood?: number; price_gofood?: number }) {
    const basePrice = product.price_offline ?? product.price ?? 0;
    if (channelType === 'online') {
      if (platform === 'shopeefood') return product.price_shopeefood ?? basePrice;
      if (platform === 'gofood') return product.price_gofood ?? basePrice;
    }
    return basePrice;
  }

  function addProductAsItem(product: { id: string; name: string; price?: number; price_offline?: number; price_shopeefood?: number; price_gofood?: number }) {
    const unitPrice = getProductPrice(product);
    setItems((current) => [
      ...current,
      {
        id: String(Date.now() + Math.random()),
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: Number(unitPrice || 0),
      },
    ]);
    setSearchTerm('');
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()));

  function addRow() {
    const fallbackProduct = filteredProducts[0] || products[0];
    if (fallbackProduct) {
      addProductAsItem(fallbackProduct);
      return;
    }

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
      if (items.some((item) => !item.product_id || !item.product_name || item.quantity <= 0 || item.unit_price <= 0)) {
        alert('Pilih menu dulu untuk setiap baris, lalu isi qty yang valid');
        return;
      }

      const normalizedGrossAmount = grossAmount;
      const payload = {
        session_id: sessionId || null,
        outlet_id: outletId || null,
        channel_type: channelType,
        platform: channelType === 'online' ? platform || null : null,
        channel: channelType === 'offline' ? 'offline' : platform || 'offline',
        payment_method: paymentMode === 'split' ? 'split' : paymentMethod,
        gross_amount: normalizedGrossAmount,
        payment_status: paymentMode === 'split' ? 'settled' : paymentStatus,
        settlement_date: paymentMode === 'split' ? null : settlementDate || null,
        items: items.map((it) => ({ product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price })),
        payment_entries:
          paymentMode === 'split'
            ? items.map((it, index) => ({
                payment_method: index === 0 ? paymentMethod : 'qris',
                amount: it.quantity * Number(it.unit_price || 0),
                payment_status: 'settled',
                settlement_date: settlementDate || null,
                payment_reference: null,
                notes: null,
              }))
            : [
                {
                  payment_method: paymentMethod,
                  amount: normalizedGrossAmount,
                  payment_status: paymentStatus,
                  settlement_date: settlementDate || null,
                  payment_reference: null,
                  notes: null,
                },
              ],
      };
      await onSubmit(payload);
      // reset
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={inline ? 'space-y-5' : 'space-y-5'}>
      {!inline && (
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-4 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide uppercase/none">Batch Penjualan</p>
              <p className="mt-1 text-sm text-orange-50/90">Gunakan form ini untuk input beberapa item dalam satu transaksi.</p>
            </div>
            <div className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/25">
              {items.length} baris
            </div>
          </div>

          <div className="space-y-4 bg-white p-4">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
              <div className="space-y-2">
                <Label>Jenis Channel</Label>
                <Select value={channelType} onValueChange={(v) => setChannelType(v as 'offline' | 'online')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'qris')}>
                  <SelectTrigger className="w-full">
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
              <div className="space-y-2 md:col-span-2 xl:col-span-1">
                <Label>Platform Online</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as 'shopeefood' | 'gofood' | '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shopeefood">ShopeeFood</SelectItem>
                    <SelectItem value="gofood">GoFood</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
              <div className="space-y-2">
                <Label>Status Pembayaran</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'settled' | 'pending')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="settled">Settled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label>Tanggal Settlement</Label>
                <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Cari menu</p>
            <p className="text-xs text-slate-500">Pilih item dari daftar, lalu isi jumlah. Harga mengikuti channel yang sedang aktif.</p>
          </div>
          <div className="text-xs text-slate-500">{filteredProducts.length} menu ditemukan</div>
        </div>

        <div className="space-y-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari menu, contoh: roti bakar coklat"
          />
          <div className="max-h-56 overflow-auto rounded-xl border border-dashed border-slate-200 p-2">
            {filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">Tidak ada menu cocok</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductAsItem(product)}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">Klik untuk menambahkan ke transaksi</p>
                      </div>
                      <div className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        Rp {Number(getProductPrice(product) || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Belum ada item. Cari menu di atas lalu klik item yang mau ditambahkan.
          </div>
        ) : items.map((row, index) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Item {index + 1}</p>
                <p className="text-xs text-slate-500">Nama item dan jumlah saja. Harga mengikuti item yang dipilih.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => removeRow(row.id)} className="px-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                Hapus
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px]">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Produk / Nama</Label>
                <Input
                  placeholder="Pilih dari menu di atas"
                  value={row.product_name}
                  readOnly
                />
                <p className="text-xs text-slate-500">{row.product_id ? `Terpilih: ${row.product_name}` : 'Belum ada item dipilih'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={String(row.quantity)}
                  onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
        <Button type="button" onClick={addRow} variant="outline">
          Tambah Item dari Hasil Cari
        </Button>
        <p className="text-sm text-slate-600">
          Jumlah Kotor: <span className="font-semibold text-slate-900">Rp {grossAmount.toLocaleString('id-ID')}</span>
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
        {loading ? 'Menyimpan...' : 'Simpan Penjualan'}
      </Button>
    </form>
  );
}

export default BatchSaleForm;
