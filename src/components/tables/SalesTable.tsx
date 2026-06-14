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
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-100">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Transaksi {transactionNumber}
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
          <div className="mb-4">
            <div className="text-sm font-semibold text-slate-800 mb-2">Daftar Item</div>
            <div className="space-y-2">
              {transactionItems.map((item, index) => (
                <div key={`${sale.id}-${item.product_id || index}`} className="flex items-center justify-between gap-3 pl-3 pr-2 py-1.5 rounded bg-slate-50 border-l-2 border-amber-300">
                  <span className="text-sm text-slate-800 font-medium flex-1">
                    {item.product_name || 'Item'} × {item.quantity || 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    Rp {Number(item.subtotal || (item.quantity || 1) * (item.unit_price || 0)).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal per Transaksi */}
          <div className="mb-4 p-3 rounded-md bg-slate-100 border border-slate-300 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 font-medium">Subtotal Item:</span>
              <span className="font-semibold text-slate-900">Rp {Number(sale.gross_amount || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 font-medium">Subtotal Bersih:</span>
              <span className="font-semibold text-emerald-700">Rp {Number(sale.net_amount || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Detail Fee Button & Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => setInfoSaleId((prev) => (prev === sale.id ? null : sale.id))}
              className="inline-flex h-7 px-3 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium gap-1.5"
              aria-label="Lihat detail fee"
              title="Lihat detail fee"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Detail Fee
            </button>
          </div>

          {isInfoOpen && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 shadow-sm">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-700">Harga item real:</span>
                  <span className="font-semibold">Rp {sale.gross_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Potongan fee:</span>
                  <span className="font-semibold text-red-600">Rp {(sale.platform_fee || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Uang masuk bersih:</span>
                  <span className="font-semibold text-emerald-700">Rp {sale.net_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Persentase fee:</span>
                  <span className="font-semibold text-amber-700">{(sale.fee_percentage || 0).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {sale.notes && <div className="text-xs text-gray-600 italic mt-3">Catatan: {sale.notes}</div>}
        </div>
      );
    }


    // Offline format: "Produk - Rp XXX ×Qty"
    return (
      <div key={sale.id} className="py-2 px-0 flex justify-between items-center gap-3 text-sm">
        <div className="flex-1">
          {sale.product_name || 'Item'} - Rp {sale.net_amount.toLocaleString('id-ID')} ×{sale.quantity || 1}
          {sale.type === 'custom' && sale.custom_description && (
            <div className="text-xs text-blue-600 mt-1">{sale.custom_description}</div>
          )}
          {sale.notes && (
            <div className="text-xs text-gray-500 mt-1">{sale.notes}</div>
          )}
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
                  <div className="mt-4 p-3 rounded-lg border border-amber-300 bg-amber-50">
                    <div className="text-sm font-semibold text-amber-900 mb-2">Total {title.split(' ')[0]}</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800">Total Transaksi:</span>
                        <span className="font-semibold text-amber-900">Rp {sectionGross.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800">Total Bersih Diterima:</span>
                        <span className="font-semibold text-emerald-700">Rp {sectionTotal.toLocaleString('id-ID')}</span>
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