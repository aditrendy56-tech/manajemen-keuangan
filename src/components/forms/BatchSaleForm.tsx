'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { calculateSaleAnalysis } from '@/lib/calculations/platform-fees';
import { CustomPricingTab } from '@/components/forms/CustomPricingTab';
import { DiskonMenuItem, DiskonLangsung } from '@/types';

interface ItemRow {
  id: string;
  product_name: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  // Diskon menu fields
  has_diskon_menu?: boolean;
  price_diskon_menu?: number;
}

interface DiskonLangsungRow {
  id: string;
  urutan: number;
  amount: number;
  notes?: string;
}

interface SalePayload {
  session_id: string | null;
  outlet_id: string | null;
  channel_type: 'offline' | 'online' | 'custom';
  platform: string | null;
  channel: string;
  payment_method: string;
  gross_amount: number;
  net_revenue: number;
  calculated_total: number;
  fee_amount: number;
  fee_percentage: number;
  payment_status: string;
  settlement_date: string | null;
  items: Array<{ product_id?: string | null; quantity: number; unit_price: number }>;
  payment_entries: Array<{
    payment_method: string;
    amount: number;
    payment_status: string;
    settlement_date: string | null;
    payment_reference: string | null;
    notes: string | null;
  }>;
  diskon_menu_items?: DiskonMenuItem[];
  diskon_langsung?: DiskonLangsung[];
}

interface BatchSaleFormProps {
  onSubmit: (payload: SalePayload) => Promise<void>;
  sessionId?: string | null;
  outletId?: string | null;
  initialChannelType?: 'offline' | 'online' | 'custom';
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
  type ActiveTab = 'offline_cash' | 'offline_qris' | 'shopeefood' | 'gofood' | 'split' | 'custom';

  const getInitialTab = (): ActiveTab => {
    if (initialChannelType === 'online') {
      return initialPlatform === 'gofood' ? 'gofood' : 'shopeefood';
    }
    if (initialPaymentMethod === 'split') return 'split';
    if (initialChannelType === 'custom') return 'custom';
    return initialPaymentMethod === 'qris' ? 'offline_qris' : 'offline_cash';
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab());
  
  const isOnline = activeTab === 'shopeefood' || activeTab === 'gofood';
  const isCustomTab = activeTab === 'custom';
  const platform = activeTab === 'shopeefood' ? 'shopeefood' : activeTab === 'gofood' ? 'gofood' : null;
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>(activeTab === 'split' ? 'split' : 'single');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>(activeTab === 'offline_qris' ? 'qris' : 'cash');
  const [paymentStatus, setPaymentStatus] = useState<'settled' | 'pending'>('settled');
  const [netRevenue, setNetRevenue] = useState('');

  const defaultPaymentEntry = {
    id: 'payment-entry-default',
    payment_method: 'cash' as const,
    amount: '0',
    payment_status: 'settled' as const,
    settlement_date: '',
    payment_reference: '',
    notes: '',
  };

  function createDefaultPaymentEntry() {
    const entryId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'payment-entry-default';
    return {
      id: entryId,
      payment_method: 'cash' as const,
      amount: '0',
      payment_status: 'settled' as const,
      settlement_date: '',
      payment_reference: '',
      notes: '',
    };
  }

  const [paymentEntries, setPaymentEntries] = useState<Array<{
    id: string;
    payment_method: 'cash' | 'qris' | 'bank_transfer' | 'pending';
    amount: string;
    payment_status: 'settled' | 'pending';
    settlement_date: string;
    payment_reference: string;
    notes: string;
  }>>([defaultPaymentEntry]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [diskonLangsungRows, setDiskonLangsungRows] = useState<DiskonLangsungRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; name: string; price?: number; price_offline?: number; price_shopeefood?: number; price_gofood?: number }>>([]);

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
    if (platform === 'shopeefood') return product.price_shopeefood ?? basePrice;
    if (platform === 'gofood') return product.price_gofood ?? basePrice;
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
        has_diskon_menu: false,
        price_diskon_menu: undefined,
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
    setItems((s) => [...s, { id: String(Date.now() + Math.random()), product_name: '', quantity: 1, unit_price: 0, has_diskon_menu: false }]);
  }

  function updateRow(id: string, patch: Partial<ItemRow>) {
    setItems((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setItems((s) => s.filter((r) => r.id !== id));
  }

  // Calculate gross amount with diskon menu applied
  const grossAmount = items.reduce((sum, it) => {
    const itemPrice = it.has_diskon_menu && it.price_diskon_menu !== undefined 
      ? it.price_diskon_menu 
      : it.unit_price;
    return sum + it.quantity * Number(itemPrice || 0);
  }, 0);
  
  const totalDiskonLangsung = diskonLangsungRows.reduce((sum, r) => sum + r.amount, 0);
  const subtotalAfterDiskonLangsung = grossAmount - totalDiskonLangsung;
  
  const explicitNetRevenue = netRevenue.trim() !== '' ? Number(netRevenue || 0) : 0;
  const analysis = isOnline && explicitNetRevenue > 0
    ? calculateSaleAnalysis(grossAmount, explicitNetRevenue)
    : calculateSaleAnalysis(grossAmount, grossAmount);
  const feeGapPercentage = analysis.fee_percentage;
  const splitPaymentTotal = paymentEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  function handleTabChange(nextTab: ActiveTab) {
    setActiveTab(nextTab);
    setItems([]);
    setNetRevenue('');
    setPaymentEntries([createDefaultPaymentEntry()]);
    setDiskonLangsungRows([]);
    
    if (nextTab === 'split') {
      setPaymentMode('split');
      setPaymentMethod('cash');
    } else if (nextTab === 'offline_qris') {
      setPaymentMode('single');
      setPaymentMethod('qris');
    } else if (nextTab === 'offline_cash') {
      setPaymentMode('single');
      setPaymentMethod('cash');
    } else if (nextTab === 'shopeefood' || nextTab === 'gofood') {
      setPaymentMode('single');
      setPaymentMethod('qris');
    } else if (nextTab === 'custom') {
      setPaymentMode('single');
      setPaymentMethod('cash');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (items.some((item) => !item.product_id || !item.product_name || item.quantity <= 0 || item.unit_price <= 0)) {
        alert('Pilih menu dulu untuk setiap baris, lalu isi qty yang valid');
        return;
      }

      if (isOnline && explicitNetRevenue <= 0) {
        alert('Untuk penjualan online, harus input Pendapatan Bersih dari Aplikasi');
        return;
      }

      const normalizedGrossAmount = grossAmount;

      // Validasi split payment
      if (paymentMode === 'split') {
        if (paymentEntries.length < 2) {
          alert('Split payment butuh minimal 2 baris pembayaran');
          return;
        }
        if (Math.abs(splitPaymentTotal - normalizedGrossAmount) > 0.01) {
          alert(`Total split payment (Rp ${splitPaymentTotal.toLocaleString('id-ID')}) harus sama dengan gross amount (Rp ${normalizedGrossAmount.toLocaleString('id-ID')})`);
          return;
        }
      }

      // Build diskon menu items array
      const diskonMenuItems = items
        .map((item, index) => {
          if (item.has_diskon_menu && item.price_diskon_menu !== undefined && item.product_id) {
            return {
              item_index: index,
              product_id: item.product_id,
              product_name: item.product_name,
              qty: item.quantity,
              price_normal: item.unit_price,
              price_after_diskon: item.price_diskon_menu,
            };
          }
          return null;
        })
        .filter((item) => item !== null) as DiskonMenuItem[];

      // For online sales: fee calculation should consider diskon langsung
      let feeForCalculation = analysis.fee_amount;
      if (isOnline && explicitNetRevenue > 0) {
        // Fee is calculated from original gross amount, but user sees it as potongan komisi
        // Actual fee = gross - diskon langsung - net revenue
        feeForCalculation = grossAmount - totalDiskonLangsung - explicitNetRevenue;
      }

      const channelType: SalePayload['channel_type'] = isOnline ? 'online' : isCustomTab ? 'custom' : 'offline';

      const payload: SalePayload = {
        session_id: sessionId || null,
        outlet_id: outletId || null,
        channel_type: channelType,
        platform: platform,
        channel: platform ?? (activeTab === 'custom' ? 'custom' : activeTab === 'split' ? 'split' : 'offline'),
        payment_method: activeTab === 'split' ? 'split' : paymentMethod,
        gross_amount: normalizedGrossAmount,
        net_revenue: isOnline ? explicitNetRevenue : normalizedGrossAmount,
        calculated_total: analysis.calculated_total,
        fee_amount: feeForCalculation,
        fee_percentage: normalizedGrossAmount > 0 ? (feeForCalculation / normalizedGrossAmount) * 100 : 0,
        payment_status: paymentMode === 'split' ? (paymentEntries.every((entry) => entry.payment_status === 'settled') ? 'settled' : 'pending') : paymentStatus,
        settlement_date: null,
        items: items.map((it) => ({ 
          product_id: it.product_id, 
          quantity: it.quantity, 
          unit_price: it.has_diskon_menu && it.price_diskon_menu !== undefined ? it.price_diskon_menu : it.unit_price 
        })),
        payment_entries:
          paymentMode === 'split'
            ? paymentEntries.map((entry) => ({
                payment_method: entry.payment_method,
                amount: Number(entry.amount || 0),
                payment_status: entry.payment_status,
                settlement_date: entry.settlement_date || null,
                payment_reference: entry.payment_reference || null,
                notes: entry.notes || null,
              }))
            : [
                {
                  payment_method: paymentMethod,
                  amount: normalizedGrossAmount,
                  payment_status: paymentStatus,
                  settlement_date: null,
                  payment_reference: null,
                  notes: null,
                },
              ],
        // Add discount data
        diskon_menu_items: diskonMenuItems.length > 0 ? diskonMenuItems : undefined,
        diskon_langsung: diskonLangsungRows.length > 0 ? diskonLangsungRows.map(row => ({
          urutan: row.urutan,
          amount: row.amount,
          notes: row.notes,
        })) : undefined,
      };
      await onSubmit(payload);
      // reset
      setItems([]);
      setNetRevenue('');
      setPaymentEntries([createDefaultPaymentEntry()]);
      setDiskonLangsungRows([]);
    } finally {
      setLoading(false);
    }
  }

  const tabConfig = {
    offline_cash: { label: 'Offline Cash', icon: '💵' },
    offline_qris: { label: 'Offline QRIS', icon: '📱' },
    shopeefood: { label: 'ShopeeFood', icon: '🍱' },
    gofood: { label: 'GoFood', icon: '🍽️' },
    split: { label: 'Split', icon: '💳' },
    custom: { label: 'Custom', icon: '⚙️' },
  } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!inline && (
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-4 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide">Penjualan</p>
              <p className="mt-1 text-sm text-orange-50/90">Pilih kategori, input item, dan selesaikan pembayaran</p>
            </div>
            <div className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/25">
              {items.length} item
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(tabConfig) as Array<[ActiveTab, (typeof tabConfig)[ActiveTab]]>).map(([tab, config]) => {
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabChange(tab)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold tracking-wide shadow-sm transition-all duration-150 ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                  >
                    <span className="text-base leading-none">{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isCustomTab ? (
            <div className="space-y-4 bg-white p-4">
              <CustomPricingTab
                sessionId={sessionId ?? ''}
                outletId={outletId ?? ''}
                onSubmit={() => {
                  setItems([]);
                  setNetRevenue('');
                  setPaymentEntries([createDefaultPaymentEntry()]);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4 bg-white p-4">
              {/* PAYMENT SETTINGS (top section) */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase text-slate-600">Pengaturan Pembayaran</p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">Mode Pembayaran</Label>
                    <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'single' | 'split')}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Satu Metode</SelectItem>
                        <SelectItem value="split">Split Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMode === 'single' && (
                    <>
                      <div>
                        <Label className="text-xs">Metode</Label>
                        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'qris')}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="qris">QRIS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'settled' | 'pending')}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="settled">Settled</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {paymentMode === 'split' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-900 mb-2">Split Payment</p>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {paymentEntries.map((entry) => (
                      <div key={entry.id} className="flex gap-2 items-center text-xs">
                        <Select
                          value={entry.payment_method}
                          onValueChange={(v) => setPaymentEntries(prev => prev.map((e) => e.id === entry.id ? { ...e, payment_method: v as 'cash' | 'qris' | 'bank_transfer' | 'pending' } : e))}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="qris">QRIS</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="0"
                          value={entry.amount}
                          onChange={(e) => setPaymentEntries(prev => prev.map(en => en.id === entry.id ? { ...en, amount: e.target.value } : en))}
                          className="flex-1 h-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPaymentEntries(prev => prev.filter(e => e.id !== entry.id))}
                          className="px-2 text-red-600"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentEntries(prev => [...prev, {
                      id: String(Date.now()),
                      payment_method: 'cash',
                      amount: '0',
                      payment_status: 'settled',
                      settlement_date: '',
                      payment_reference: '',
                      notes: '',
                    }])}
                    className="mt-2 w-full text-xs h-8"
                  >
                    Tambah Pembayaran
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isCustomTab && (
        <>
      {/* SEARCH & SELECT PRODUCTS */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Cari Menu</p>
          <p className="text-xs text-slate-500">Klik item untuk menambahkan ke transaksi</p>
        </div>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari menu..."
          className="text-sm"
        />
        <div className="max-h-56 overflow-auto rounded-lg border border-dashed border-slate-200 p-2">
          {filteredProducts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">Tidak ada menu cocok</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProductAsItem(product)}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-left text-xs transition hover:border-orange-300 hover:bg-orange-50"
                >
                  <p className="truncate font-semibold text-slate-900">{product.name}</p>
                  <p className="text-orange-600 font-medium">Rp {Number(getProductPrice(product) || 0).toLocaleString('id-ID')}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ITEMS LIST - WITH DISKON MENU */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">Belum ada item. Cari dan klik menu di atas untuk menambahkan.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-200">
            {items.map((row, index) => (
              <div key={row.id} className="p-3 hover:bg-slate-50 space-y-2">
                {/* Row 1: Item info + qty + delete */}
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{row.product_name}</p>
                    <p className="text-xs text-slate-500">Rp {(row.unit_price || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={String(row.quantity)}
                      onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) })}
                      className="w-14 h-8 text-center text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="px-2 text-red-600 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                {/* Row 2: Diskon menu checkbox + harga diskon (optional) */}
                <div className="flex items-center gap-2 pl-9">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      id={`diskon-${row.id}`}
                      type="checkbox"
                      checked={Boolean(row.has_diskon_menu)}
                      onChange={(e) => {
                        updateRow(row.id, {
                          has_diskon_menu: e.target.checked,
                          price_diskon_menu: e.target.checked ? row.unit_price : undefined,
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label htmlFor={`diskon-${row.id}`} className="text-xs font-medium text-slate-700 cursor-pointer">
                      Diskon Menu
                    </label>
                  </div>
                  {row.has_diskon_menu && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-600">Harga:</span>
                      <Input
                        type="number"
                        min="0"
                        max={row.unit_price}
                        value={String(row.price_diskon_menu || 0)}
                        onChange={(e) => updateRow(row.id, { price_diskon_menu: Number(e.target.value) })}
                        placeholder="0"
                        className="w-24 h-7 text-xs text-center"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 px-3 py-2 flex justify-between items-center border-t border-slate-200">
            <Button type="button" onClick={addRow} variant="ghost" size="sm" className="text-xs">
              + Tambah Item
            </Button>
            <div className="text-xs font-semibold text-slate-700">
              Total: Rp {grossAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      )}

      {/* ONLINE-ONLY: DISKON LANGSUNG → FEE ANALYSIS → NET REVENUE INPUT */}
      {isOnline && (
        <div className="space-y-3">
          {/* 1. DISKON LANGSUNG SECTION (FIRST) */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-purple-950">💜 Diskon Langsung</p>
              <p className="text-xs text-purple-700">{diskonLangsungRows.length} diskon</p>
            </div>
            
            {diskonLangsungRows.length === 0 ? (
              <p className="text-xs text-purple-700 mb-3">Klo gada diskon, bisa dikosongkan</p>
            ) : (
              <div className="space-y-2 mb-3 max-h-48 overflow-auto rounded-lg bg-white p-2 border border-purple-200">
                {diskonLangsungRows.map((row) => (
                  <div key={row.id} className="flex gap-2 items-center text-xs p-2 bg-purple-50 rounded border border-purple-100">
                    <span className="font-medium text-purple-700 w-12">Diskon {row.urutan}</span>
                    <Input
                      type="number"
                      min="0"
                      value={String(row.amount)}
                      onChange={(e) => setDiskonLangsungRows(prev => 
                        prev.map(r => r.id === row.id ? { ...r, amount: Number(e.target.value) } : r)
                      )}
                      placeholder="Jumlah"
                      className="flex-1 h-7"
                    />
                    <Input
                      type="text"
                      value={row.notes || ''}
                      onChange={(e) => setDiskonLangsungRows(prev => 
                        prev.map(r => r.id === row.id ? { ...r, notes: e.target.value } : r)
                      )}
                      placeholder="Catatan (opsional)"
                      className="flex-1 h-7"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiskonLangsungRows(prev => {
                        const filtered = prev.filter(r => r.id !== row.id);
                        // Re-number remaining rows
                        return filtered.map((r, idx) => ({ ...r, urutan: idx + 1 }));
                      })}
                      className="px-2 text-red-600 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDiskonLangsungRows(prev => {
                const nextUrutan = prev.length + 1;
                return [...prev, {
                  id: String(Date.now()),
                  urutan: nextUrutan,
                  amount: 0,
                  notes: '',
                }];
              })}
              className="w-full text-xs h-8 text-purple-700 border-purple-300 hover:bg-purple-100"
            >
              + Tambah Diskon
            </Button>
          </div>

          {/* 2. FEE ANALYSIS SECTION (SECOND) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950 mb-3">📊 Analisis Komisi/Fee {platform === 'shopeefood' ? 'ShopeeFood (20%)' : 'GoFood (25%)'}</p>
            <div className="space-y-2 mb-3">
              <div className="rounded-lg bg-white p-3 border border-amber-200">
                <p className="text-xs text-amber-700 mb-1">Total Harga Item</p>
                <p className="text-lg font-bold text-amber-900">Rp {grossAmount.toLocaleString('id-ID')}</p>
                {items.some(it => it.has_diskon_menu) && (
                  <p className="text-xs text-slate-600 mt-1">(sudah termasuk diskon menu per item)</p>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="flex-1 h-px bg-amber-200"></div>
                <span className="text-xs text-amber-600 font-medium">Dikurangi</span>
                <div className="flex-1 h-px bg-amber-200"></div>
              </div>
              
              <div className="rounded-lg bg-white p-3 border border-red-200">
                <p className="text-xs text-red-700 mb-1">Diskon Langsung</p>
                <p className="text-lg font-bold text-red-600">-Rp {totalDiskonLangsung.toLocaleString('id-ID')}</p>
                <p className="text-xs text-slate-600 mt-1">{diskonLangsungRows.length} {diskonLangsungRows.length === 1 ? 'diskon' : 'diskon'}</p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="flex-1 h-px bg-amber-200"></div>
                <span className="text-xs text-amber-600 font-medium">=</span>
                <div className="flex-1 h-px bg-amber-200"></div>
              </div>
              
              <div className="rounded-lg bg-amber-100 p-3 border border-amber-300">
                <p className="text-xs text-amber-700 mb-1">Subtotal (setelah diskon)</p>
                <p className="text-lg font-bold text-amber-900">Rp {subtotalAfterDiskonLangsung.toLocaleString('id-ID')}</p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="flex-1 h-px bg-amber-200"></div>
                <span className="text-xs text-amber-600 font-medium">Dikurangi</span>
                <div className="flex-1 h-px bg-amber-200"></div>
              </div>
              
              <div className="rounded-lg bg-white p-3 border border-orange-200">
                <p className="text-xs text-orange-700 mb-1">Komisi/Fee Marketplace</p>
                <p className="text-lg font-bold text-orange-600">-Rp {(subtotalAfterDiskonLangsung - explicitNetRevenue).toLocaleString('id-ID')}</p>
                <p className="text-xs text-slate-600 mt-1">≈ {explicitNetRevenue > 0 ? (((subtotalAfterDiskonLangsung - explicitNetRevenue) / subtotalAfterDiskonLangsung) * 100).toFixed(1) : 0}%</p>
              </div>
            </div>
          </div>

          {/* 3. NET REVENUE INPUT (LAST) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <Label className="text-sm font-semibold text-slate-900">💰 Pendapatan Bersih dari {platform === 'shopeefood' ? 'ShopeeFood' : 'GoFood'} (Rp)</Label>
            <CurrencyInput
              value={netRevenue}
              onChange={(e) => setNetRevenue(e.target.value)}
              placeholder="Masukkan uang real yang masuk ke kas"
              showVisual={true}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-2">Nilai ini dipakai sebagai uang real untuk dashboard dan cash flow.</p>

            {/* Warning jika ada gap */}
            {explicitNetRevenue > 0 && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Perbandingan:</p>
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Item:</span>
                    <span className="font-medium text-blue-900">Rp {grossAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Diskon Langsung:</span>
                    <span className="font-medium text-red-600">-Rp {diskonLangsungRows.reduce((sum, r) => sum + r.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2">
                    <span className="text-blue-700">Pendapatan Bersih (input):</span>
                    <span className="font-bold text-blue-900">Rp {explicitNetRevenue.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                
                {Math.abs((grossAmount - diskonLangsungRows.reduce((sum, r) => sum + r.amount, 0)) - explicitNetRevenue) > 1000 && (
                  <div className="mt-3 rounded-lg border border-amber-400 bg-white p-3 text-amber-900 text-xs">
                    ⚠️ <strong>Ada perbedaan</strong> antara kalkulasi dengan uang yang masuk. Cek apakah ada komisi/potongan marketplace lain atau diskon yang belum tercatat.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isCustomTab && (
        <Button type="submit" disabled={loading || items.length === 0} className="w-full bg-orange-600 hover:bg-orange-700 h-10 font-semibold">
          {loading ? 'Menyimpan...' : `Simpan ${platform ? (platform === 'shopeefood' ? 'ShopeeFood' : 'GoFood') : 'Offline'}`}
        </Button>
      )}
        </>
      )}
    </form>
  );
}

export default BatchSaleForm;
