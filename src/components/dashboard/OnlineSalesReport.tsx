'use client';

import { Sale } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface OnlineSalesReportProps {
  sales: Sale[];
}

export function OnlineSalesReport({ sales }: OnlineSalesReportProps) {
  // Filter dan hitung untuk setiap platform
  const gofood = sales.filter(
    (s) => String(s.platform || '').toLowerCase() === 'gofood' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const shopeefood = sales.filter(
    (s) => String(s.platform || '').toLowerCase() === 'shopeefood' && s.type !== 'custom' && s.payment_status !== 'refunded'
  );

  const calcGross = (items: Sale[]) => items.reduce((sum, s) => sum + (s.gross_amount || 0), 0);
  const calcFee = (items: Sale[]) => items.reduce((sum, s) => sum + (s.platform_fee || 0), 0);
  const calcNet = (items: Sale[]) => calcGross(items) - calcFee(items);

  const gofoodGross = calcGross(gofood);
  const gofoodFee = calcFee(gofood);
  const gofoodNet = calcNet(gofood);
  const gofoodCount = gofood.length;

  const shopeefoodGross = calcGross(shopeefood);
  const shopeefoodFee = calcFee(shopeefood);
  const shopeefoodNet = calcNet(shopeefood);
  const shopeefoodCount = shopeefood.length;

  const totalGross = gofoodGross + shopeefoodGross;
  const totalFee = gofoodFee + shopeefoodFee;
  const totalNet = gofoodNet + shopeefoodNet;
  const totalCount = gofoodCount + shopeefoodCount;

  if (totalCount === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Laporan Penjualan Online</CardTitle>
              <p className="text-xs text-slate-600 mt-1">{totalCount} transaksi</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* GoFood Card */}
          <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">GoFood</p>
                <p className="text-sm text-slate-600 mt-1">{gofoodCount} transaksi</p>
              </div>
              <div className="text-3xl">🍽️</div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline py-2 border-b border-blue-50">
                <span className="text-sm text-slate-700">Gross</span>
                <span className="font-semibold text-slate-900">Rp {gofoodGross.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-baseline py-2">
                <span className="text-sm text-slate-700">Fee Platform</span>
                <span className="font-medium text-red-600">−Rp {gofoodFee.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-baseline py-2 border-t-2 border-blue-200 pt-3">
                <span className="text-sm font-semibold text-slate-900">Net Received</span>
                <span className="text-lg font-bold text-blue-700">Rp {gofoodNet.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* ShopeeFood Card */}
          <div className="bg-white rounded-xl border border-orange-100 p-5 shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">ShopeeFood</p>
                <p className="text-sm text-slate-600 mt-1">{shopeefoodCount} transaksi</p>
              </div>
              <div className="text-3xl">🍜</div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline py-2 border-b border-orange-50">
                <span className="text-sm text-slate-700">Gross</span>
                <span className="font-semibold text-slate-900">Rp {shopeefoodGross.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-baseline py-2">
                <span className="text-sm text-slate-700">Fee Platform</span>
                <span className="font-medium text-red-600">−Rp {shopeefoodFee.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-baseline py-2 border-t-2 border-orange-200 pt-3">
                <span className="text-sm font-semibold text-slate-900">Net Received</span>
                <span className="text-lg font-bold text-orange-700">Rp {shopeefoodNet.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide mb-1">Total Gross</p>
              <p className="text-lg font-bold">Rp {totalGross.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide mb-1">Total Fee</p>
              <p className="text-lg font-bold text-red-200">−Rp {totalFee.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide mb-1">Total Net</p>
              <p className="text-lg font-bold">Rp {totalNet.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
