'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Sale } from '@/types';

interface SalesTableProps {
  sales: Sale[];
  onDelete?: (id: string) => void;
  onRefund?: (sale: Sale | Sale[]) => void;
  withCard?: boolean;
}

type SaleLineItem = NonNullable<Sale['sale_items']>[number];
type DiscountMenuEntry = NonNullable<Sale['diskon_menu_items']>[number];
type DiscountDirectEntry = NonNullable<Sale['diskon_langsung']>[number];

export function SalesTable({ sales, onDelete, onRefund, withCard = true }: SalesTableProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    offlineCash: true,
    offlineQRIS: true,
    gofood: true,
    shopeefood: true,
    custom: true,
    refund: true,
  });

  const [selectedRefunds, setSelectedRefunds] = useState<Set<string>>(new Set());
  const [infoSaleId, setInfoSaleId] = useState<string | null>(null);

  function toNumber(value: number | string | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleRefundSelection = (saleId: string) => {
    const newSelected = new Set(selectedRefunds);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedRefunds(newSelected);
  };

  // Group sales by channel/method (non-refunded)
  const offlineCash = sales.filter(
    (s) => s.channel_type === 'offline' && s.payment_method === 'cash' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const offlineQRIS = sales.filter(
    (s) => s.channel_type === 'offline' && s.payment_method === 'qris' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const offlineSplit = sales.filter(
    (s) => s.channel_type === 'offline' && s.payment_method === 'split' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const gofood = sales.filter(
    (s) => String(s.platform || '').toLowerCase() === 'gofood' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const shopeefood = sales.filter(
    (s) => String(s.platform || '').toLowerCase() === 'shopeefood' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const custom = sales.filter((s) => s.type === 'custom' && s.payment_status !== 'refunded');
  const refunded = sales.filter((s) => s.payment_status === 'refunded');

  // Calculate totals
  const calcTotal = (items: Sale[]) => items.reduce((sum, s) => sum + (s.net_amount || 0), 0);
  const calcGross = (items: Sale[]) => items.reduce((sum, s) => sum + (s.gross_amount || 0), 0);
  const calcFee = (items: Sale[]) => items.reduce((sum, s) => sum + (s.platform_fee || 0), 0);
  const calcHppTotal = (items: Sale[]) => items.reduce((sum, s) => {
    if (Array.isArray(s.sale_items) && s.sale_items.length > 0) {
      return sum + s.sale_items.reduce((itemSum, item) => {
        const qty = item.quantity || 1;
        const costPrice = Number(item.cost_price ?? item.hpp_amount ?? 0);
        return itemSum + (costPrice * qty);
      }, 0);
    }
    return sum;
  }, 0);
  const calcDiscountTotal = (items: Sale[]) => items.reduce((sum, s) => {
    const diskonMenuTotal = s.diskon_menu_total ?? (Array.isArray(s.diskon_menu_items)
      ? s.diskon_menu_items.reduce((itemSum, item) => itemSum + (((item.price_normal || item.unit_price || 0) - (item.price_after_diskon || item.unit_price || 0)) * (item.qty || item.quantity || 1)), 0)
      : 0);
    const diskonLangsungTotal = s.diskon_langsung_total ?? (Array.isArray(s.diskon_langsung)
      ? s.diskon_langsung.reduce((itemSum, item) => itemSum + (item.amount || 0), 0)
      : 0);
    return sum + (s.total_discounts ?? (diskonMenuTotal + diskonLangsungTotal));
  }, 0);
  const calcItemCount = (items: Sale[]) => items.reduce((sum, s) => {
    if (typeof s.item_count === 'number' && s.item_count > 0) return sum + s.item_count;
    if (Array.isArray(s.sale_items) && s.sale_items.length > 0) {
      return sum + s.sale_items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
    }
    return sum + (s.quantity || 1);
  }, 0);

  const offlineCashTotal = calcTotal(offlineCash);
  const offlineQRISTotal = calcTotal(offlineQRIS);
  const offlineSplitTotal = calcTotal(offlineSplit);
  const offlineTotal = offlineCashTotal + offlineQRISTotal + offlineSplitTotal;

  const gofoodGross = calcGross(gofood);
  const gofoodFee = calcFee(gofood);
  const gofoodNet = gofoodGross - gofoodFee;

  const shopeefoodGross = calcGross(shopeefood);
  const shopeefoodFee = calcFee(shopeefood);
  const shopeefoodNet = shopeefoodGross - shopeefoodFee;

  const customTotal = calcTotal(custom);
  const totalHpp = calcHppTotal(sales.filter((s) => s.payment_status !== 'refunded'));
  const grandTotal = offlineTotal + gofoodNet + shopeefoodNet + customTotal;
  const netRevenueAfterHpp = grandTotal - totalHpp;

  function renderItem(sale: Sale, showNetFormat: boolean = false, transactionNumber: number = 0) {
    const isRefundable = sale.payment_status !== 'refunded';
    const isInfoOpen = infoSaleId === sale.id;

    if (showNetFormat) {
      const transactionItems = Array.isArray(sale.sale_items) && sale.sale_items.length > 0
        ? sale.sale_items
        : [{ product_name: sale.product_name || 'Item', quantity: sale.quantity || 1, unit_price: sale.gross_amount || sale.net_amount || 0, subtotal: sale.gross_amount || sale.net_amount || 0 }];

      return (
        <div key={sale.id} className="py-3 px-4 mb-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
          {/* Header dengan Transaction Number & Kontrol */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="inline-block bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                Transaksi {transactionNumber}
              </span>
              <span className="text-xs text-slate-500">{sale.id ? sale.id.slice(0, 8) : ''}</span>
            </div>
            {isRefundable && (
              <div className="flex items-center gap-2">
                {onRefund && (
                  <input
                    type="checkbox"
                    checked={selectedRefunds.has(sale.id)}
                    onChange={() => toggleRefundSelection(sale.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(sale.id)}
                    className="text-red-600 hover:bg-red-50 p-1 h-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Item List */}
          <div className="space-y-2 mb-3 pb-3 border-b border-slate-200">
            {transactionItems.map((item: SaleLineItem, index: number) => {
              const itemDiskon = Array.isArray(sale.diskon_menu_items)
                ? sale.diskon_menu_items.find((d: DiscountMenuEntry) => d.product_id === item.product_id || d.item_index === index)
                : null;

              const normalPrice = Number(item.unit_price || 0);
              const discountedPrice = itemDiskon ? Number(itemDiskon.price_after_diskon ?? normalPrice) : normalPrice;
              const qty = item.quantity || 1;
              const originalTotal = normalPrice * qty;
              const discountedTotal = discountedPrice * qty;
              const hasMenuDiscount = itemDiskon && originalTotal > discountedTotal;

              return (
                <div key={`${sale.id}-${item.product_id || 'item'}-${index}`} className="text-sm flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{item.product_name || 'Item'}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">×{qty}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {hasMenuDiscount ? (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500 line-through">Rp {originalTotal.toLocaleString('id-ID')}</div>
                        <div className="font-semibold text-slate-900">Rp {discountedTotal.toLocaleString('id-ID')}</div>
                      </div>
                    ) : (
                      <div className="font-semibold text-slate-900">Rp {discountedTotal.toLocaleString('id-ID')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Subtotal</span>
              <span className="font-semibold text-slate-900">Rp {Number(transactionItems.reduce((sum: number, item: SaleLineItem, index: number) => {
                const itemDiskon = Array.isArray(sale.diskon_menu_items)
                  ? sale.diskon_menu_items.find((d: DiscountMenuEntry) => d.product_id === item.product_id || d.item_index === index)
                  : null;
                const discountedPrice = itemDiskon ? Number(itemDiskon.price_after_diskon ?? Number(item.unit_price || 0)) : Number(item.unit_price || 0);
                return sum + discountedPrice * (item.quantity || 1);
              }, 0)).toLocaleString('id-ID')}</span>
            </div>
            {Array.isArray(sale.diskon_langsung) && sale.diskon_langsung.length > 0 && (
              <div className="flex justify-between text-yellow-700">
                <span>Diskon Langsung</span>
                <span className="font-semibold">−Rp {Number(sale.diskon_langsung.reduce((sum: number, d: DiscountDirectEntry) => sum + (d.amount || 0), 0)).toLocaleString('id-ID')}</span>
              </div>
            )}
            {(sale.platform_fee || 0) > 0 && (
              <div className="flex justify-between text-red-700">
                <span>Biaya Komisi</span>
                <span className="font-semibold">−Rp {Number(sale.platform_fee || 0).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-base">
              <span className="text-slate-900">Jumlah Penyelesaian</span>
              <span className="text-slate-900">Rp {Number(sale.net_amount || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Detail Button */}
          {(() => {
            const hasPlatformFee = (sale.platform_fee || 0) > 0;
            const diskonMenuTotal = sale.diskon_menu_total ?? (Array.isArray(sale.diskon_menu_items) ? sale.diskon_menu_items.reduce((s: number, it: DiscountMenuEntry) => s + (((it.price_normal || it.unit_price || 0) - (it.price_after_diskon || it.unit_price || 0)) * (it.qty || it.quantity || 1)), 0) : 0);
            const diskonLangsungTotal = sale.diskon_langsung_total ?? (Array.isArray(sale.diskon_langsung) ? sale.diskon_langsung.reduce((s: number, it: DiscountDirectEntry) => s + (it.amount || 0), 0) : 0);
            const totalDiscounts = sale.total_discounts ?? (diskonMenuTotal + diskonLangsungTotal);
            const hasDiscounts = totalDiscounts > 0 || (Array.isArray(sale.diskon_menu_items) && sale.diskon_menu_items.length > 0) || (Array.isArray(sale.diskon_langsung) && sale.diskon_langsung.length > 0);
            const showButton = isRefundable && (hasPlatformFee || hasDiscounts);

            if (!showButton) return null;

            return (
              <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInfoSaleId((prev) => (prev === sale.id ? null : sale.id))}
                  className="inline-flex h-8 px-3 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-medium gap-1.5 transition-all"
                >
                  {isInfoOpen ? '▲ Tutup Detail' : '▼ Lihat Detail'}
                </button>
              </div>
            );
          })()}

          {isInfoOpen && (
            <div className="rounded-lg border border-slate-300 bg-gradient-to-br from-slate-50 to-white p-4 mt-3 text-xs space-y-3">
              <div className="font-bold text-slate-900">Analisis Transaksi</div>
              
              {(() => {
                const diskonMenuTotal = sale.diskon_menu_total ?? (Array.isArray(sale.diskon_menu_items) ? sale.diskon_menu_items.reduce((s: number, it: DiscountMenuEntry) => s + (((it.price_normal || it.unit_price || 0) - (it.price_after_diskon || it.unit_price || 0)) * (it.qty || it.quantity || 1)), 0) : 0);
                const diskonLangsungTotal = sale.diskon_langsung_total ?? (Array.isArray(sale.diskon_langsung) ? sale.diskon_langsung.reduce((s: number, it: DiscountDirectEntry) => s + (it.amount || 0), 0) : 0);
                const totalDiscounts = sale.total_discounts ?? (diskonMenuTotal + diskonLangsungTotal);
                const platformFee = sale.platform_fee || 0;
                const grossAmount = toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount);
                const netAmount = sale.net_amount || 0;

                return (
                  <div className="space-y-2 border-t border-slate-200 pt-2">
                    <div className="flex justify-between">
                      <span>Harga Asli:</span>
                      <span className="font-semibold">Rp {grossAmount.toLocaleString('id-ID')}</span>
                    </div>
                    {totalDiscounts > 0 && (
                      <div className="flex justify-between text-yellow-700">
                        <span>Diskon Total:</span>
                        <span className="font-semibold">−Rp {totalDiscounts.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {platformFee > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>Biaya Platform:</span>
                        <span className="font-semibold">−Rp {platformFee.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-300 pt-2 font-bold flex justify-between text-slate-900">
                      <span>Total Bersih:</span>
                      <span>Rp {netAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
    } else {
      // Offline format: Iterate sale_items if available, otherwise use product_name fallback
      const offlineItems = Array.isArray(sale.sale_items) && sale.sale_items.length > 0
      ? sale.sale_items
      : [{ product_name: sale.product_name || 'Item', quantity: sale.quantity || 1, unit_price: sale.net_amount || 0, subtotal: sale.net_amount || 0 }];

    const offlineItemsTotal = offlineItems.reduce((sum, item) => sum + Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)), 0);

    return (
      <div key={sale.id} className="py-3 px-4 mb-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
        {/* Header dengan Transaction Number & Kontrol */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="inline-block bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Transaksi {transactionNumber}
            </span>
            <span className="text-xs text-slate-500">{sale.id ? sale.id.slice(0, 8) : ''}</span>
          </div>
          {isRefundable && (
            <div className="flex items-center gap-2">
              {onRefund && (
                <input
                  type="checkbox"
                  checked={selectedRefunds.has(sale.id)}
                  onChange={() => toggleRefundSelection(sale.id)}
                  className="w-4 h-4 cursor-pointer"
                />
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(sale.id)}
                  className="text-red-600 hover:bg-red-50 p-1 h-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Item List */}
        <div className="space-y-2 mb-3 pb-3 border-b border-slate-200">
          {offlineItems.map((item, idx) => (
            <div key={`${sale.id}-${item.product_id || 'item'}-${idx}`} className="text-sm flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>{item.product_name || 'Item'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">×{item.quantity || 1}</span>
                </div>
              </div>
              <div className="text-right shrink-0 font-semibold text-slate-900">
                Rp {Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="space-y-1 text-sm">
          {sale.type === 'custom' && sale.custom_description && (
            <div className="text-xs text-blue-600 mb-2 p-2 bg-blue-50 rounded">{sale.custom_description}</div>
          )}
          {sale.notes && (
            <div className="text-xs text-slate-500 mb-2 p-2 bg-slate-50 rounded">{sale.notes}</div>
          )}
          <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-base">
            <span className="text-slate-900">Jumlah Penyelesaian</span>
            <span className="text-slate-900">Rp {offlineItemsTotal.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    );
    }
  }

  function renderOfflineItemsCombined(sales: Sale[]) {
    // Gabung semua items dari semua transaksi
    const allItems: Array<SaleLineItem & { transactionId: string; transactionIndex: number }> = [];
    
    sales.forEach((sale, transIndex) => {
      const saleItems = Array.isArray(sale.sale_items) && sale.sale_items.length > 0
        ? sale.sale_items
        : [{ product_name: sale.product_name || 'Item', quantity: sale.quantity || 1, unit_price: sale.net_amount || 0, subtotal: sale.net_amount || 0 }];
      
      saleItems.forEach((item, itemIndex) => {
        allItems.push({
          ...item,
          transactionId: sale.id,
          transactionIndex: transIndex + 1,
        });
      });
    });

    const totalAmount = allItems.reduce((sum, item) => sum + Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)), 0);

    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left font-semibold text-slate-900">Nama Item</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-900">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-900">Harga Satuan</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-900">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, idx) => (
                <tr key={`${item.transactionId}-${item.product_id || 'item'}-${idx}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 font-medium">{item.product_name || 'Item'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.quantity || 1}</td>
                  <td className="px-4 py-3 text-right text-slate-700">Rp {Number(item.unit_price || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">Rp {Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-right">
          <div className="inline-block border border-slate-300 rounded-lg p-3 bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">Total Penerimaan</div>
            <div className="text-xl font-bold text-slate-900">Rp {totalAmount.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>
    );
  }

  function renderSection(title: string, sectionKey: string, items: Sale[], showNetFormat: boolean = false) {
    const isExpanded = expandedSections[sectionKey];
    const sectionTotal = calcTotal(items);
    const sectionGross = calcGross(items);
    const sectionDiscount = calcDiscountTotal(items);
    const sectionFee = calcFee(items);
    const sectionHpp = calcHppTotal(items);
    const sectionItemCount = calcItemCount(items);
    const sectionEstimatedProfit = sectionGross - sectionDiscount - sectionFee - sectionHpp;
    const sectionMargin = sectionGross > 0 ? (sectionEstimatedProfit / sectionGross) * 100 : 0;
    const isOnlineSection = showNetFormat;
    const isOfflineSection = ['offlineCash', 'offlineQRIS', 'offlineSplit'].includes(sectionKey);

    return (
      <div key={sectionKey} className="mb-5 rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded transition-colors ${isExpanded ? 'bg-slate-100' : 'bg-slate-50'}`}>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900">{title}</span>
              <span className="text-xs text-slate-500 ml-2">({items.length} trans.)</span>
            </div>
          </div>
          <span className="font-bold text-slate-900 text-base">Rp {sectionTotal.toLocaleString('id-ID')}</span>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-200 bg-slate-50/50">
            {items.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-sm">—</div>
            ) : (
              <>
                <div className="px-4 py-4">
                  {isOfflineSection ? renderOfflineItemsCombined(items) : (
                    <div className="space-y-3">
                      {items.map((item, index) => renderItem(item, showNetFormat, index + 1))}
                    </div>
                  )}
                </div>

                {/* Footer: Summary untuk online sections */}
                {isOnlineSection && (
                  <div className="px-4 py-3 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ringkasan {title}</div>
                    <div className="space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Item Terjual:</span>
                        <span className="font-semibold">{sectionItemCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Harga Asli:</span>
                        <span className="font-semibold">Rp {sectionGross.toLocaleString('id-ID')}</span>
                      </div>
                      {sectionDiscount > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Total Diskon:</span>
                          <span className="font-semibold">−Rp {sectionDiscount.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {sectionFee > 0 && (
                        <div className="flex justify-between text-red-700">
                          <span>Total Fee:</span>
                          <span className="font-semibold">−Rp {sectionFee.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {sectionHpp > 0 && (
                        <div className="flex justify-between text-purple-700">
                          <span>Potongan HPP:</span>
                          <span className="font-semibold">−Rp {sectionHpp.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-300 pt-1 mt-1 flex justify-between font-bold text-sm">
                        <span className="text-emerald-700">Estimasi Bersih:</span>
                        <span className="text-emerald-700">Rp {sectionEstimatedProfit.toLocaleString('id-ID')} ({sectionMargin.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-base bg-slate-50 -mx-4 -mb-3 px-4 py-2.5">
                      <span className="text-slate-900">Jumlah Penyelesaian</span>
                      <span className="text-slate-900">Rp {sectionTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}

                {!isOnlineSection && !isOfflineSection && (
                  <div className="px-4 py-4 border-t border-slate-200 space-y-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ringkasan {title}</div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="text-slate-500 text-xs">Total Item Terjual</div>
                        <div className="text-base font-semibold text-slate-900">{sectionItemCount}</div>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-3 sm:col-span-2">
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <div className="text-slate-500 text-xs">Total Penerimaan</div>
                            <div className="text-sm text-slate-600">Semua transaksi</div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-semibold text-slate-900">Rp {sectionTotal.toLocaleString('id-ID')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div className="space-y-1">
      {sales.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-sm">Tidak ada data penjualan</div>
      ) : (
        <>
          {/* OFFLINE - CASH */}
          {renderSection('OFFLINE - CASH', 'offlineCash', offlineCash)}

          {/* OFFLINE - QRIS */}
          {renderSection('OFFLINE - QRIS', 'offlineQRIS', offlineQRIS)}

          {/* OFFLINE - SPLIT */}
          {renderSection('OFFLINE - SPLIT', 'offlineSplit', offlineSplit)}

          {/* GOFOOD */}
          {renderSection('GOFOOD', 'gofood', gofood, true)}

          {/* SHOPEEFOOD */}
          {renderSection('SHOPEEFOOD', 'shopeefood', shopeefood, true)}

          {/* CUSTOM PRICING */}
          {renderSection('CUSTOM PRICING', 'custom', custom)}

          {/* TOTAL SECTION */}
          {sales.some((s) => s.payment_status !== 'refunded') && (
            <div className="border rounded-lg bg-amber-50 overflow-hidden mt-6 pt-4">
              <div className="px-4 py-3 border-b font-bold text-sm">TOTAL</div>
              <div className="px-4 py-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Offline - Cash:</span>
                  <span>Rp {offlineCashTotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Offline - QRIS:</span>
                  <span>Rp {offlineQRISTotal.toLocaleString('id-ID')}</span>
                </div>
                {offlineSplitTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Offline - Split:</span>
                    <span>Rp {offlineSplitTotal.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total Offline:</span>
                  <span>Rp {offlineTotal.toLocaleString('id-ID')}</span>
                </div>

                {gofoodNet > 0 && (
                  <div className="flex justify-between pt-1">
                    <span>GoFood (Net):</span>
                    <span>Rp {gofoodNet.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {shopeefoodNet > 0 && (
                  <div className="flex justify-between">
                    <span>ShopeeFood (Net):</span>
                    <span>Rp {shopeefoodNet.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {customTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Custom Pricing:</span>
                    <span>Rp {customTotal.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-slate-600 pt-1">
                  <span>Total HPP Makanan:</span>
                  <span>−Rp {totalHpp.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between font-bold border-t pt-1 text-base">
                  <span>Total Penjualan:</span>
                  <span className="text-orange-700">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between text-sm text-slate-700 pt-1">
                  <span>Pendapatan Bersih</span>
                  <span className="font-semibold text-emerald-700">Rp {netRevenueAfterHpp.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          {/* REFUND SECTION */}
          {(refunded.length > 0 || selectedRefunds.size > 0) && (
            <div className="border rounded-lg bg-white overflow-hidden mt-6">
              <button
                onClick={() => toggleSection('refund')}
                className="w-full px-4 py-3 flex items-center justify-between bg-red-50 hover:bg-red-100 text-sm"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.refund ? (
                    <ChevronDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-semibold text-red-800">REFUND</span>
                </div>
                {selectedRefunds.size > 0 && (
                  <Badge className="bg-red-600 text-xs">
                    {selectedRefunds.size} dipilih
                  </Badge>
                )}
              </button>

              {expandedSections.refund && (
                <div className="px-4 py-3 space-y-2">
                  {sales
                    .filter((s) => s.payment_status !== 'refunded')
                    .map((sale) => (
                      <label
                        key={sale.id}
                        className="flex items-center gap-3 cursor-pointer text-sm hover:text-red-600"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRefunds.has(sale.id)}
                          onChange={() => toggleRefundSelection(sale.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          Rp {sale.net_amount.toLocaleString('id-ID')}
                        </div>
                      </label>
                    ))}

                  {selectedRefunds.size > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <Button
                        onClick={() => {
                          const selectedSales = Array.from(selectedRefunds)
                            .map((id) => sales.find((s) => s.id === id))
                            .filter(Boolean) as Sale[];
                          if (onRefund) {
                            onRefund(selectedSales);
                            setSelectedRefunds(new Set());
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-xs h-auto py-2"
                      >
                        Proses Refund {selectedRefunds.size} Item
                      </Button>
                    </div>
                  )}

                  {refunded.length > 0 && (
                    <>
                      <div className="pt-3 border-t mt-3 text-xs font-semibold text-gray-600">
                        Sudah Direfund ({refunded.length})
                      </div>
                      {refunded.map((sale) => (
                        <div
                          key={sale.id}
                          className="text-xs text-gray-400 line-through"
                        >
                          Rp{' '}
                          {sale.refund_amount?.toLocaleString('id-ID') || sale.net_amount.toLocaleString('id-ID')}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!withCard) {
    return <>{content}</>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Penjualan</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}