'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReportsTable } from '@/components/tables/ReportsTable';
import { RevenueByChannelChart } from '@/components/charts/RevenueByChannelChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { TopProductsChart } from '@/components/charts/TopProductsChart';
import { ProfitLossReport } from '@/types';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock report data
  const mockReport: ProfitLossReport = {
    gross_revenue: 500000,
    platform_fees: 75000,
    net_revenue: 425000,
    total_expenses: 225000,
    expenses_by_category: {
      bahan_baku: 150000,
      operasional: 50000,
      transport: 25000,
    },
    gross_profit: 200000,
    net_profit: 200000,
    profit_margin: 40,
  };

  async function handleExport() {
    try {
      const response = await fetch(`/api/reports/export?outlet_id=outlet-1&outlet_name=Outlet%20Utama&start_date=${startDate}&end_date=${endDate}`);
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
      <ReportsTable report={mockReport} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueByChannelChart
          data={{
            offline: 150000,
            shopeefood: 175000,
            gofood: 100000,
          }}
        />
        <PaymentMethodChart
          data={{
            cash: 250000,
            qris: 175000,
          }}
        />
      </div>

      <TopProductsChart
        data={[
          { name: 'Roti Bakar Standar', quantity: 45 },
          { name: 'Roti Bakar Premium', quantity: 30 },
          { name: 'Roti Bakar Spesial', quantity: 20 },
        ]}
      />
    </div>
  );
}