'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { RevenueByChannelChart } from '@/components/charts/RevenueByChannelChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { DailyProfitChart } from '@/components/charts/DailyProfitChart';
import { CashBalanceDashboard } from '@/components/dashboard/CashBalanceDashboard';
import { DashboardMetrics } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [cashRefreshTrigger, setCashRefreshTrigger] = useState(0);
  const { outletId } = useOutlet();

  useEffect(() => {
    if (!outletId) return;
    fetchMetrics();
  }, [outletId]);

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
        today_cash_inflow: 0,
        today_cash_outflow: 0,
        today_pending_sales: 0,
        today_pending_expenses: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleClearTodayTestData() {
    if (!outletId) return;

    const targetDate = new Date().toISOString().split('T')[0];
    const confirmText = `Hapus semua data transaksi TEST tanggal ${targetDate} untuk outlet ini?`;
    if (!confirm(confirmText)) return;

    setClearing(true);
    try {
      const response = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          mode: 'today_test_data',
          date: targetDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal membersihkan data test hari ini');
      }

      await fetchMetrics();
      setCashRefreshTrigger(prev => prev + 1);
      alert('Data test hari ini berhasil dibersihkan untuk outlet aktif.');
    } catch (error: any) {
      alert(error.message || 'Gagal membersihkan data test hari ini');
    } finally {
      setClearing(false);
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
        <div className="mt-3">
          <button
            onClick={handleClearTodayTestData}
            disabled={clearing}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {clearing ? 'Membersihkan...' : 'Bersihkan Data Test Hari Ini'}
          </button>
        </div>
      </div>

      {/* Cash Balance with Refund Visualization */}
      {outletId && <CashBalanceDashboard outletId={outletId} refreshTrigger={cashRefreshTrigger} />}

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-700">Rp {(metrics.today_cash_inflow || 0).toLocaleString('id-ID')}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-red-700">Rp {(metrics.today_cash_outflow || 0).toLocaleString('id-ID')}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-700">Rp {(metrics.today_pending_sales || 0).toLocaleString('id-ID')}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-700">Rp {(metrics.today_pending_expenses || 0).toLocaleString('id-ID')}</span>
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
