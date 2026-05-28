'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingCart, Zap } from 'lucide-react';
import { RevenueByChannelChart } from '@/components/charts/RevenueByChannelChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { DailyProfitChart } from '@/components/charts/DailyProfitChart';
import { DashboardMetrics } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashTotals, setCashTotals] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
  const { outletId } = useOutlet();

  useEffect(() => {
    fetchMetrics();
    fetchCashTotals();
  }, []);

  async function fetchMetrics() {
    try {
      const response = await fetch(`/api/dashboard?outlet_id=${outletId}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      // Set empty data on error
      setMetrics({
        today_gross_revenue: 0,
        today_net_revenue: 0,
        today_profit: 0,
        revenue_by_channel: { offline: 0, shopeefood: 0, gofood: 0 },
        payment_methods: { cash: 0, qris: 0 },
        top_products: [],
        weekly_profit: [],
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCashTotals() {
    try {
      const res = await fetch(`/api/cash-transactions?outlet_id=${outletId}&limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch cash transactions');
      const data = await res.json();
      const totalIn = (data || [])
        .filter((t: any) => t.transaction_type === 'in')
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const totalOut = (data || [])
        .filter((t: any) => t.transaction_type === 'out')
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      setCashTotals({ totalIn, totalOut, balance: totalIn - totalOut });
    } catch (err) {
      console.error('Failed to fetch cash totals', err);
      setCashTotals({ totalIn: 0, totalOut: 0, balance: 0 });
    }
  }

  if (loading) {
    return <div className="text-center py-8">Memuat data...</div>;
  }

  if (!metrics) {
    return <div className="text-center py-8 text-red-600">Gagal memuat data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Selamat datang kembali! Berikut ringkasan hari ini.</p>
      </div>

      {/* Cash Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">Rp {cashTotals.totalIn.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold">Rp {cashTotals.totalOut.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Saldo Kas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <span className="text-2xl font-bold">Rp {cashTotals.balance.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pendapatan Kotor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">Rp {metrics.today_gross_revenue.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pendapatan Bersih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">Rp {metrics.today_net_revenue.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Keuntungan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold">Rp {metrics.today_profit.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Top Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold">{metrics.top_products[0]?.name || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueByChannelChart data={metrics.revenue_by_channel} />
        <PaymentMethodChart data={metrics.payment_methods} />
      </div>

      {/* Daily Profit Chart */}
      <DailyProfitChart data={metrics.weekly_profit} />
    </div>
  );
}
