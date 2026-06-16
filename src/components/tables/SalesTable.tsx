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
    (s) => s.platform === 'gofood' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const shopeefood = sales.filter(
    (s) => s.platform === 'shopeefood' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const custom = sales.filter((s) => s.type === 'custom' && s.payment_status !== 'refunded');
  const refunded = sales.filter((s) => s.payment_status === 'refunded');

  // Calculate totals
  const calcTotal = (items: Sale[]) => items.reduce((sum, s) => sum + (s.net_amount || 0), 0);
  const calcGross = (items: Sale[]) => items.reduce((sum, s) => sum + (s.gross_amount || 0), 0);
  const calcFee = (items: Sale[]) => items.reduce((sum, s) => sum + (s.platform_fee || 0), 0);

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
  const grandTotal = offlineTotal + gofoodNet + shopeefoodNet + customTotal;

  function renderItem(sale: Sale, showNetFormat: boolean = false, transactionNumber: number = 0) {
    const isRefundable = sale.payment_status !== 'refunded';
    const isOnlineSale = sale.channel_type === 'online' || sale.platform === 'gofood' || sale.platform === 'shopeefood';
    const isInfoOpen = infoSaleId === sale.id;

    if (showNetFormat && sale.platform_fee > 0) {
      const transactionItems = Array.isArray(sale.sale_items) && sale.sale_items.length > 0
        ? sale.sale_items
        : [{ product_name: sale.product_name || 'Item', quantity: sale.quantity || 1, unit_price: sale.gross_amount || sale.net_amount || 0, subtotal: sale.gross_amount || sale.net_amount || 0 }];

      return (
        <div key={sale.id} className="py-4 px-4 mb-3 rounded-lg border border-amber-200 bg-white">
          {/* Header dengan Nomor Transaksi dan Kontrol */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-amber-200">
            <div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="inline-block bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  TXN #{transactionNumber}
                </span>
                <span className="text-xs text-slate-600 font-normal">{sale.id ? sale.id.slice(0, 8) : ''}</span>
              </div>
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

          {/* Daftar Item - Lebih Prominent */}
          <div className="mb-5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5 px-1">Item Breakdown</div>
            <div className="space-y-2">
              {transactionItems.map((item, index) => (
                <div key={`${sale.id}-${item.product_id || index}`} className="flex items-start justify-between gap-3 p-2.5 rounded-md bg-gradient-to-r from-amber-50 to-white border border-amber-100 hover:border-amber-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {item.product_name || 'Item'}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                      <span className="inline-block bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">×{item.quantity || 1}</span>
                      <span className="text-slate-500">@ Rp {Number(item.unit_price || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-slate-900">
                      Rp {Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal per Transaksi */}
          <div className="mb-4 p-3.5 rounded-lg bg-slate-50 border-2 border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-700 font-semibold">Item Total:</span>
              <span className="font-bold text-slate-900 text-base">Rp {Number(sale.gross_amount || 0).toLocaleString('id-ID')}</span>
            </div>
            {(sale.platform_fee || 0) > 0 && (
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-300">
                <span className="text-red-700 font-semibold">Platform Fee ({(sale.fee_percentage || 0).toFixed(1)}%):</span>
                <span className="font-bold text-red-600">− Rp {Number(sale.platform_fee || 0).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base pt-2 border-t-2 border-slate-300">
              <span className="text-slate-900 font-bold">Net Amount:</span>
              <span className="font-bold text-emerald-700 text-lg">Rp {Number(sale.net_amount || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Detail Fee Button & Info */}
          {(sale.platform_fee || 0) > 0 && (
            <div className="flex items-center justify-end mb-3">
              <button
                type="button"
                onClick={() => setInfoSaleId((prev) => (prev === sale.id ? null : sale.id))}
                className="inline-flex h-8 px-3 items-center justify-center rounded-md border-2 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold gap-1.5 transition-all"
                aria-label="Lihat detail fee"
                title="Lihat detail fee dan breakdown"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {isInfoOpen ? 'Hide Fee Detail' : 'Show Fee Detail'}
              </button>
            </div>
          )}

          {isInfoOpen && (
            <div className="rounded-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-sm shadow-sm mb-3">
              <div className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Fee Breakdown
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between pb-2.5 border-b border-amber-200">
                  <span className="text-amber-800">Item Price:</span>
                  <span className="font-bold text-slate-900">Rp {sale.gross_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-amber-200">
                  <span className="text-amber-800">Platform Fee:</span>
                  <span className="font-bold text-red-600">− Rp {(sale.platform_fee || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pb-2.5 border-b-2 border-amber-400">
                  <span className="text-amber-900 font-bold">Fee Rate:</span>
                  <span className="font-bold text-amber-700">{(sale.fee_percentage || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between pt-2.5">
                  <span className="text-slate-900 font-bold">Amount Received:</span>
                  <span className="font-bold text-emerald-700 text-base">Rp {sale.net_amount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          {sale.notes && <div className="text-xs text-gray-600 italic mt-3">Catatan: {sale.notes}</div>}
        </div>
      );
    }


    // Offline format: Iterate sale_items if available, otherwise use product_name fallback
    const offlineItems = Array.isArray(sale.sale_items) && sale.sale_items.length > 0
      ? sale.sale_items
      : [{ product_name: sale.product_name || 'Item', quantity: sale.quantity || 1, unit_price: sale.net_amount || 0, subtotal: sale.net_amount || 0 }];

    const offlineItemsTotal = offlineItems.reduce((sum, item) => sum + Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)), 0);

    return (
      <div key={sale.id} className="py-3 px-0 border-b last:border-b-0">
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="flex-1 space-y-1">
            {offlineItems.map((item, idx) => (
              <div key={`${sale.id}-${item.product_id || idx}`} className="flex justify-between items-center gap-3 text-sm">
                <div className="flex-1">
                  {item.product_name || 'Item'} <span className="text-gray-600">×{item.quantity || 1}</span>
                </div>
                <div className="text-right whitespace-nowrap font-medium">
                  Rp {Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
            {sale.type === 'custom' && sale.custom_description && (
              <div className="text-xs text-blue-600 mt-1">{sale.custom_description}</div>
            )}
            {sale.notes && (
              <div className="text-xs text-gray-500 mt-1">{sale.notes}</div>
            )}
          </div>
          {isRefundable && (
            <div className="flex items-center gap-2 flex-shrink-0">
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
        {offlineItems.length > 1 && (
          <div className="text-right text-sm font-semibold pt-1 border-t text-slate-700">
            Subtotal: Rp {offlineItemsTotal.toLocaleString('id-ID')}
          </div>
        )}
      </div>
    );
  }

  function renderSection(title: string, sectionKey: string, items: Sale[], showNetFormat: boolean = false) {
    const isExpanded = expandedSections[sectionKey];
    const sectionTotal = calcTotal(items);
    const sectionGross = calcGross(items);
    const isOnlineSection = showNetFormat;

    return (
      <div key={sectionKey} className="mb-4 pt-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between text-left font-semibold text-sm pb-2 border-b"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span>{title}</span>
          </div>
          <span className="text-gray-700">Rp {sectionTotal.toLocaleString('id-ID')}</span>
        </button>

        {isExpanded && (
          <div>
            {items.length === 0 ? (
              <div className="py-2 text-center text-gray-400 text-sm">—</div>
            ) : (
              <>
                <div className="mt-1 space-y-1">
                  {items.map((item, index) => renderItem(item, showNetFormat, index + 1))}
                </div>

                {/* Footer: Total Transaksi & Total Bersih untuk online sections */}
                {isOnlineSection && (
                  <div className="mt-5 p-4 rounded-lg border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm">
                    <div className="text-sm font-bold text-amber-950 mb-3 uppercase tracking-wide">
                      {title} Summary
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800 font-semibold">Total Transactions:</span>
                        <span className="font-bold text-slate-900">Rp {sectionGross.toLocaleString('id-ID')}</span>
                      </div>
                      {sectionGross !== sectionTotal && (
                        <div className="flex justify-between text-sm pt-2 border-t border-amber-200">
                          <span className="text-amber-800 font-semibold">Platform Fees:</span>
                          <span className="font-bold text-red-600">− Rp {(sectionGross - sectionTotal).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base pt-2 border-t-2 border-amber-300">
                        <span className="text-slate-900 font-bold">Net Received:</span>
                        <span className="font-bold text-emerald-700">Rp {sectionTotal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!isOnlineSection && (
                  <div className="py-2 text-sm font-semibold text-right mt-2">
                    Subtotal: Rp {sectionTotal.toLocaleString('id-ID')}
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

                <div className="flex justify-between font-bold border-t pt-1 text-base">
                  <span>TOTAL PENJUALAN:</span>
                  <span className="text-orange-700">Rp {grandTotal.toLocaleString('id-ID')}</span>
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