'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchReport();
  }, [outletId, startDate, endDate]);

  async function fetchReport() {
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
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
      <div>
        <h1 className="text-3xl font-bold">Laporan Keuangan</h1>
        <p className="text-gray-600">Laporan Profit & Loss dan analisis keuangan</p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="start_date">Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end_date">Sampai</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueByChannelChart data={revenueByChannel} />
            <PaymentMethodChart data={paymentMethod} />
          </div>

          {topProducts.length > 0 && <TopProductsChart data={topProducts} />}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Tidak ada data laporan</div>
      )}
    </div>
  );
}