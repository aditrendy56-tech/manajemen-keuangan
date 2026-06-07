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
    offline: true,
    gofood: true,
    shopeefood: true,
    custom: true,
    refund: true,
  });

  const [selectedRefunds, setSelectedRefunds] = useState<Set<string>>(new Set());

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

  // Group sales by type and channel
  const offlineCash = sales.filter(
    (s) => s.channel_type === 'offline' && s.payment_method !== 'split' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );
  const offlineQRIS = offlineCash.filter((s) => s.payment_method === 'qris');
  const offlineCashOnly = offlineCash.filter((s) => s.payment_method === 'cash');
  
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

  const offlineTotal = calcTotal(offlineCash) + calcTotal(offlineSplit);
  const gofoodGross = calcGross(gofood);
  const gofoodFee = calcFee(gofood);
  const gofoodNet = gofoodGross - gofoodFee;
  const shopeefoodGross = calcGross(shopeefood);
  const shopeefoodFee = calcFee(shopeefood);
  const shopeefoodNet = shopeefoodGross - shopeefoodFee;
  const customTotal = calcTotal(custom);
  const grandTotal = offlineTotal + gofoodNet + shopeefoodNet + customTotal;

  function renderTransaction(sale: Sale) {
    const isRefundable = sale.payment_status !== 'refunded';

    return (
      <div key={sale.id} className="py-2 px-3 bg-white border-l-4 border-transparent hover:bg-gray-50">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="text-sm font-medium">
              [{sale.id.substring(0, 8)}]
              {sale.type === 'custom' && sale.product_id && (
                <span className="ml-2 text-gray-700">
                  {/* Product name would be fetched from product_id */}
                  {sale.quantity}× item
                </span>
              )}
              {sale.type !== 'custom' && (
                <span className="ml-2 text-gray-700">Rp {sale.gross_amount.toLocaleString('id-ID')}</span>
              )}
            </div>
            {sale.type === 'custom' && sale.custom_description && (
              <div className="text-xs text-blue-600 mt-1">
                Alasan: {sale.custom_description}
              </div>
            )}
            {sale.notes && (
              <div className="text-xs text-gray-500 mt-1">{sale.notes}</div>
            )}
          </div>

          <div className="text-right min-w-max">
            {sale.platform_fee > 0 && (
              <div className="text-xs text-gray-600 mb-1">
                Kotor: Rp {sale.gross_amount.toLocaleString('id-ID')} | Fee: -Rp{' '}
                {sale.platform_fee.toLocaleString('id-ID')}
              </div>
            )}
            <div className="text-sm font-semibold">
              Rp {sale.net_amount.toLocaleString('id-ID')}
            </div>
          </div>

          {isRefundable && (
            <div className="flex items-center gap-2 ml-2">
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
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSection(
    title: string,
    sectionKey: string,
    items: Sale[],
    showFeeBreakdown: boolean = false
  ) {
    const isExpanded = expandedSections[sectionKey];
    const sectionGross = calcGross(items);
    const sectionFee = calcFee(items);
    const sectionNet = calcTotal(items);

    return (
      <div key={sectionKey} className="border rounded-lg overflow-hidden mb-4 bg-white">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 border-b"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
            <span className="font-semibold text-gray-800">{title}</span>
          </div>
          <div className="text-sm font-semibold text-gray-700">
            {showFeeBreakdown
              ? `Bersih: Rp ${sectionNet.toLocaleString('id-ID')}`
              : `Total: Rp ${sectionNet.toLocaleString('id-ID')}`}
          </div>
        </button>

        {isExpanded && (
          <div className="divide-y">
            {items.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Tidak ada transaksi</div>
            ) : (
              <>
                {items.map(renderTransaction)}
                <div className="px-4 py-3 bg-gray-50 border-t-2 font-semibold text-sm">
                  {showFeeBreakdown ? (
                    <div className="flex justify-between">
                      <span>
                        Kotor: Rp {sectionGross.toLocaleString('id-ID')} | Fee: -Rp{' '}
                        {sectionFee.toLocaleString('id-ID')}
                      </span>
                      <span>Bersih: Rp {sectionNet.toLocaleString('id-ID')}</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      Total: Rp {sectionNet.toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {sales.length === 0 ? (
        <div className="py-12 text-center text-gray-500">Tidak ada data penjualan</div>
      ) : (
        <>
          {/* Offline Section */}
          {(offlineCashOnly.length > 0 || offlineQRIS.length > 0 || offlineSplit.length > 0) &&
            renderSection(
              '📦 OFFLINE (Cash + QRIS)',
              'offline',
              [...offlineCashOnly, ...offlineQRIS, ...offlineSplit]
            )}

          {/* GoFood Section */}
          {gofood.length > 0 && renderSection('🚚 GOFOOD', 'gofood', gofood, true)}

          {/* ShopeeFood Section */}
          {shopeefood.length > 0 && renderSection('🛍️ SHOPEEFOOD', 'shopeefood', shopeefood, true)}

          {/* Custom Pricing Section */}
          {custom.length > 0 &&
            renderSection(
              '🎯 CUSTOM PRICING',
              'custom',
              custom
            )}

          {/* Grand Total */}
          {sales.some((s) => s.payment_status !== 'refunded') && (
            <div className="border rounded-lg bg-white overflow-hidden">
              <div className="px-4 py-4 bg-orange-50 border-b-2">
                <h3 className="font-bold text-lg mb-3">💰 RINGKASAN TOTAL</h3>
                <div className="space-y-2 text-sm font-semibold">
                  {offlineTotal > 0 && (
                    <div className="flex justify-between">
                      <span>├─ Offline (Cash + QRIS):</span>
                      <span>Rp {offlineTotal.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {customTotal > 0 && (
                    <div className="flex justify-between">
                      <span>├─ Custom Pricing:</span>
                      <span>Rp {customTotal.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {gofoodNet > 0 && (
                    <div className="flex justify-between">
                      <span>├─ GoFood (Net):</span>
                      <span>Rp {gofoodNet.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {shopeefoodNet > 0 && (
                    <div className="flex justify-between">
                      <span>├─ ShopeeFood (Net):</span>
                      <span>Rp {shopeefoodNet.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 pt-2 text-lg">
                    <span>└─ TOTAL PENJUALAN:</span>
                    <span className="text-orange-700">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refund Section */}
          {(refunded.length > 0 || selectedRefunds.size > 0) && (
            <div className="border rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => toggleSection('refund')}
                className="w-full px-4 py-3 flex items-center justify-between bg-red-50 hover:bg-red-100 border-b"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.refund ? (
                    <ChevronDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-red-800">🔄 REFUND</span>
                </div>
                {selectedRefunds.size > 0 && (
                  <Badge className="bg-red-600">
                    {selectedRefunds.size} dipilih - Rp{' '}
                    {Array.from(selectedRefunds)
                      .reduce(
                        (sum, id) => sum + (sales.find((s) => s.id === id)?.net_amount || 0),
                        0
                      )
                      .toLocaleString('id-ID')}
                  </Badge>
                )}
              </button>

              {expandedSections.refund && (
                <div className="divide-y">
                  {/* Refund Selection Checkboxes */}
                  {sales
                    .filter((s) => s.payment_status !== 'refunded')
                    .map((sale) => (
                      <label
                        key={sale.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRefunds.has(sale.id)}
                          onChange={() => toggleRefundSelection(sale.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm">
                            [{sale.id.substring(0, 8)}] - Rp{' '}
                            {sale.net_amount.toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {sale.channel} ({sale.payment_method})
                          </div>
                        </div>
                      </label>
                    ))}

                  {/* Batch Refund Button */}
                  {selectedRefunds.size > 0 && (
                    <div className="px-4 py-3 bg-red-50 border-t-2">
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
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        Proses Refund {selectedRefunds.size} Item
                      </Button>
                    </div>
                  )}

                  {/* Already Refunded Transactions */}
                  {refunded.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600">
                        Sudah Direfund ({refunded.length})
                      </div>
                      {refunded.map((sale) => (
                        <div
                          key={sale.id}
                          className="px-4 py-2 text-xs text-gray-500 line-through"
                        >
                          [{sale.id.substring(0, 8)}] - Rp{' '}
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
        <CardTitle>📊 Laporan Penjualan Terstruktur</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}