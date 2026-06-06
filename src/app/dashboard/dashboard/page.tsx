'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingCart, Zap, ChevronRight } from 'lucide-react';
import { RevenueByChannelChart } from '@/components/charts/RevenueByChannelChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { DailyProfitChart } from '@/components/charts/DailyProfitChart';
import { CashBalanceDashboard } from '@/components/dashboard/CashBalanceDashboard';
import { ExpenseDetailsModal } from '@/components/modals/ExpenseDetailsModal';
import { DashboardMetrics } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [cashRefreshTrigger, setCashRefreshTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        today_inventory_purchases: 0,
        today_operational_expenses: 0,
        revenue_by_channel: { offline: 0, shopeefood: 0, gofood: 0 },
        payment_methods: { cash: 0, qris: 0 },
        cash_inflow_by_channel: { offline: 0, shopeefood: 0, gofood: 0 },
        expense_by_category: { bahan: 0, operasional: 0, peralatan: 0, gabungan: 0, lain_lain: 0 },
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

      {/* PHASE 2: Cash Inflow Breakdown by Channel */}
      <div>
        <h2 className="text-lg font-semibold mb-4">📊 Penjualan per Channel</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-700">Rp {(metrics.cash_inflow_by_channel?.offline || 0).toLocaleString('id-ID')}</span>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">ShopeeFood</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-700">Rp {(metrics.cash_inflow_by_channel?.shopeefood || 0).toLocaleString('id-ID')}</span>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">GoFood</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-red-700">Rp {(metrics.cash_inflow_by_channel?.gofood || 0).toLocaleString('id-ID')}</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Masuk Total</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-700">Rp {(metrics.today_cash_inflow || 0).toLocaleString('id-ID')}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Keluar Total</CardTitle>
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

      {/* PHASE 2: Expense Breakdown by Category */}
      <div>
        <h2 className="text-lg font-semibold mb-4">💸 Pengeluaran per Kategori</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Bahan */}
          <Card
            className="border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedCategory('bahan');
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Bahan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-blue-700">
                  Rp {(metrics.expense_by_category?.bahan || 0).toLocaleString('id-ID')}
                </span>
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Operasional */}
          <Card
            className="border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedCategory('operasional');
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Operasional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-orange-700">
                  Rp {(metrics.expense_by_category?.operasional || 0).toLocaleString('id-ID')}
                </span>
                <ChevronRight className="w-4 h-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          {/* Peralatan */}
          <Card
            className="border-yellow-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedCategory('peralatan');
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-700">Peralatan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-yellow-700">
                  Rp {(metrics.expense_by_category?.peralatan || 0).toLocaleString('id-ID')}
                </span>
                <ChevronRight className="w-4 h-4 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          {/* Gabungan */}
          <Card
            className="border-purple-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedCategory('gabungan');
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700">Gabungan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-purple-700">
                  Rp {(metrics.expense_by_category?.gabungan || 0).toLocaleString('id-ID')}
                </span>
                <ChevronRight className="w-4 h-4 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          {/* Lain-lain */}
          <Card
            className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedCategory('lain_lain');
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Lain-lain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-700">
                  Rp {(metrics.expense_by_category?.lain_lain || 0).toLocaleString('id-ID')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Masuk (Modal + Penjualan)</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-700">Rp {(metrics.today_cash_inflow || 0).toLocaleString('id-ID')}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Keluar (Pengeluaran)</CardTitle>
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

      {/* Expense Details Modal */}
      {selectedCategory && outletId && (
        <ExpenseDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCategory(null);
          }}
          category={selectedCategory}
          outletId={outletId}
          date={new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  );
}
