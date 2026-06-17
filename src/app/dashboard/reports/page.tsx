'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReportsTable } from '@/components/tables/ReportsTable';
import { RevenueByChannelChart } from '@/components/charts/RevenueByChannelChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { TopProductsChart } from '@/components/charts/TopProductsChart';
import { ProfitLossReport } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function ReportsPage() {
  const { outletId } = useOutlet();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revenueByChannel, setRevenueByChannel] = useState({ offline: 0, shopeefood: 0, gofood: 0 });
  const [paymentMethod, setPaymentMethod] = useState({ cash: 0, qris: 0 });
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/reports/summary?outlet_id=${outletId}&start_date=${startDate}&end_date=${endDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReport(data.report);
      setRevenueByChannel(data.revenueByChannel);
      setPaymentMethod(data.paymentMethod);
      setTopProducts(data.topProducts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching report:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endDate, outletId, startDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchReport();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchReport]);

  async function handleExport() {
    try {
      const response = await fetch(`/api/reports/export?outlet_id=${outletId}&outlet_name=Outlet%20Utama&start_date=${startDate}&end_date=${endDate}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan_${startDate}_${endDate}.xlsx`;
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900">Laporan Keuangan</h1>
        <p className="text-gray-600 mt-2">Analisis profit & loss, breakdown harian, dan performa penjualan</p>
      </div>

      {/* Date Filter */}
      <Card className="bg-white border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="start_date" className="text-sm font-medium">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="end_date" className="text-sm font-medium">Tanggal Akhir</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
              📥 Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>
              />
            </div>
            <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Report */}
      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Memuat laporan...</div>
      ) : report ? (
        <>
          <ReportsTable report={report} />

          {report.daily_breakdown && report.daily_breakdown.length > 0 && (
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Breakdown Harian</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Riwayat penjualan, HPP, dan profit per hari</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Tanggal</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Gross</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Platform Fee</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Bersih</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">HPP</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Operasional</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Profit</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Item</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.daily_breakdown.map((day) => (
                        <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-700 font-medium">{new Date(day.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-semibold">Rp {day.gross_revenue.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-medium">-Rp {day.platform_fees.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-right text-blue-700 font-bold">Rp {day.net_revenue.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-right text-amber-700 font-medium">-Rp {day.hpp.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium">-Rp {day.operational_expenses.toLocaleString('id-ID')}</td>
                          <td className={`px-4 py-3 text-right font-bold ${day.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {day.profit >= 0 ? '+' : '-'}Rp {Math.abs(day.profit).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{day.item_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <RevenueByChannelChart data={revenueByChannel} />
            </div>
            <div>
              <PaymentMethodChart data={paymentMethod} />
            </div>
          </div>

          {topProducts.length > 0 && (
            <div className="mt-8">
              <TopProductsChart data={topProducts} />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Tidak ada data laporan</div>
      )}
    </div>
  );
}