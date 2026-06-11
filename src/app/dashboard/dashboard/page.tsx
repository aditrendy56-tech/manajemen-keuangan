'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingCart, Zap, ChevronRight, ChevronDown } from 'lucide-react';
import { RevenueByChannelChart } from '@/components/charts/RevenueByChannelChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { DailyProfitChart } from '@/components/charts/DailyProfitChart';
import { ExpenseDetailsModal } from '@/components/modals/ExpenseDetailsModal';
import { DashboardMetrics } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

// Channel Detail Card Component
function ChannelDetailCard({
  channel,
  amount,
  timeFilter,
  channelMetrics,
}: {
  channel: 'offline' | 'shopeefood' | 'gofood';
  amount: number;
  timeFilter: 'today' | 'cumulative';
  channelMetrics: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const colorMap = {
    offline: { bg: 'bg-green-50', border: 'border-green-200', title: 'text-green-700', icon: '🏪' },
    shopeefood: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-700', icon: '🍜' },
    gofood: { bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-700', icon: '🍽️' },
  };

  const colors = colorMap[channel];
  const channelNames = {
    offline: 'Offline',
    shopeefood: 'ShopeeFood',
    gofood: 'GoFood',
  };

  return (
    <Card className={`${colors.border} border-l-4 ${colors.bg}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className={`text-sm font-semibold ${colors.title}`}>
            {colors.icon} {channelNames[channel]}
          </CardTitle>
          {timeFilter === 'today' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`${colors.title} hover:opacity-70`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className={`text-2xl font-bold ${colors.title}`}>
            Rp {amount.toLocaleString('id-ID')}
          </span>
        </div>

        {/* Expandable Details - Only for Today mode */}
        {timeFilter === 'today' && isExpanded && (
          <div className="border-t pt-3 mt-3 space-y-2 text-xs text-gray-700">
            {channel === 'offline' && (
              <>
                <div className="flex justify-between">
                  <span>💵 Cash:</span>
                  <span className="font-semibold">Rp {(channelMetrics.cash || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>📱 QRIS:</span>
                  <span className="font-semibold">Rp {(channelMetrics.qris || 0).toLocaleString('id-ID')}</span>
                </div>
              </>
            )}
            {(channel === 'shopeefood' || channel === 'gofood') && (
              <>
                <div className="flex justify-between">
                  <span>🔖 Platform Fee:</span>
                  <span className="font-semibold">Rp {(channelMetrics.fee || 0).toLocaleString('id-ID')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Total Items:</span>
              <span className="font-semibold">{channelMetrics.totalItems || 0}</span>
            </div>
          </div>
        )}

        {/* Show message for cumulative mode */}
        {timeFilter === 'cumulative' && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
            Pilih "Hari Ini" untuk melihat detail breakdown
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashRefreshTrigger, setCashRefreshTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'cumulative'>('today');
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
        today_pendapatan_bersih: 0,
        today_profit: 0,
        today_inventory_purchases: 0,
        today_operational_expenses: 0,
        cash_from_modal: 0,
        cash_from_sales: 0,
        expense_from_kas: 0,
        expense_from_modal: 0,
        available_for_distribution: 0,
        today_revenue_by_channel: { offline: 0, shopeefood: 0, gofood: 0 },
        today_payment_methods: { cash: 0, qris: 0 },
        today_cash_inflow_by_channel: { offline: 0, shopeefood: 0, gofood: 0 },
        today_expense_by_category: { bahan: 0, operasional: 0, peralatan: 0 },
        top_products: [],
        weekly_profit: [],
        today_cash_inflow: 0,
        today_cash_outflow: 0,
        today_pending_sales: 0,
        today_pending_expenses: 0,
        cumulative_profit: 0,
        profit_detail: {},
        capital_entries: [],
      } as DashboardMetrics);
    } finally {
      setLoading(false);
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
      {/* Header with Toggle */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-4">Selamat datang kembali! Berikut ringkasan {timeFilter === 'today' ? 'hari ini' : 'keseluruhan'}.</p>
        
        {/* Global Toggle Button - ON/OFF Style */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-50 rounded-full px-2 py-2 shadow-sm border border-slate-200 hover:shadow-md transition-shadow w-fit">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              timeFilter === 'today'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:scale-105'
            }`}
          >
            📊 Hari Ini
          </button>
          <button
            onClick={() => setTimeFilter('cumulative')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              timeFilter === 'cumulative'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:scale-105'
            }`}
          >
            📈 Total
          </button>
        </div>
      </div>

      {/* SECTION 1: Key Metrics */}
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
              <span className="text-2xl font-bold">Rp {(timeFilter === 'today' ? metrics.today_gross_revenue || 0 : metrics.cumulative_gross_revenue || 0).toLocaleString('id-ID')}</span>
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
              <span className="text-2xl font-bold">Rp {(timeFilter === 'today' ? metrics.today_pendapatan_bersih || 0 : metrics.cumulative_pendapatan_bersih || 0).toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold">Rp {(timeFilter === 'today' ? metrics.today_profit || 0 : metrics.cumulative_profit || 0).toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Jumlah Item Terjual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold">{timeFilter === 'today' ? metrics.today_total_items_sold || 0 : metrics.cumulative_total_items_sold || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 💰 SECTION 2: FINANCIAL BUCKETS */}
      <div>
        <h2 className="text-lg font-semibold mb-4">💰 Financial Buckets Anda</h2>
        <p className="text-sm text-gray-600 mb-4">Empat tempat uang Anda berada dalam bisnis roti bakar:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BUCKET 1: Kas Operasional */}
          <Card className="border-l-4 border-l-green-500 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-green-700">💵 Kas Operasional (Real)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-3xl font-bold text-green-700">
                  Rp {(timeFilter === 'today' ? metrics.today_available_cash || 0 : metrics.cumulative_available_cash || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-xs text-gray-700 bg-white p-2 rounded border border-green-200">
                <p className="font-semibold mb-1">📌 Uang tunai siap pakai</p>
                <p>Modal + Alokasi Profit - Pengeluaran</p>
                <p className="mt-1">💡 Gunakan untuk operasional harian: gaji, sewa, utilitas, dll.</p>
              </div>
            </CardContent>
          </Card>

          {/* BUCKET 2: Cash dari Penjualan */}
          <Card className="border-l-4 border-l-blue-500 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-blue-700">💸 Cash dari Penjualan (Real)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-3xl font-bold text-blue-700">
                  Rp {(timeFilter === 'today' ? metrics.today_pendapatan_bersih || 0 : metrics.cumulative_pendapatan_bersih || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-xs text-gray-700 bg-white p-2 rounded border border-blue-200">
                <p className="font-semibold mb-1">📌 Uang yang masuk dari penjualan</p>
                <p>Kotor - HPP - Platform Fee</p>
                <p className="mt-1">💡 Uang bersih setelah biaya produksi & platform.</p>
              </div>
            </CardContent>
          </Card>

          {/* BUCKET 3: Profit Analysis */}
          <Card className="border-l-4 border-l-orange-500 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-orange-700">📊 Profit Analysis (Estimate)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-3xl font-bold text-orange-700">
                  Rp {(timeFilter === 'today' ? metrics.today_profit || 0 : metrics.cumulative_profit || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-xs text-gray-700 bg-white p-2 rounded border border-orange-200">
                <p className="font-semibold mb-1">📌 Profit setelah operasional</p>
                <p>Pendapatan Bersih - Operasional</p>
                <p className="mt-1">💡 Profit yang bisa dialokasikan ke investor/modal.</p>
              </div>
            </CardContent>
          </Card>

          {/* BUCKET 4: Surplus/Deficit */}
          <Card className="border-l-4 border-l-purple-500 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-purple-700">📈 Surplus/Deficit (Buffer)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className={`text-3xl font-bold ${(timeFilter === 'today' ? metrics.today_surplus_deficit || 0 : metrics.cumulative_surplus_deficit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Rp {(timeFilter === 'today' ? metrics.today_surplus_deficit || 0 : metrics.cumulative_surplus_deficit || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-xs text-gray-700 bg-white p-2 rounded border border-purple-200">
                <p className="font-semibold mb-1">📌 Buffer kas vs profit</p>
                <p>Kas Operasional - Profit</p>
                <p className="mt-1">💡 Positif = aman. Negatif = kurang kas untuk buffer.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PHASE 2: Cash Inflow Breakdown by Channel */}
      <div>
        <h2 className="text-lg font-semibold mb-4">📊 Penjualan per Channel</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Offline Channel */}
          <ChannelDetailCard
            channel="offline"
            amount={timeFilter === 'today' ? metrics.today_cash_inflow_by_channel?.offline || 0 : metrics.cumulative_revenue_by_channel?.offline || 0}
            timeFilter={timeFilter}
            channelMetrics={{
              cash: metrics.today_payment_methods?.cash || 0,
              qris: metrics.today_payment_methods?.qris || 0,
              totalItems: metrics.today_total_items_sold || 0,
            }}
          />
          {/* ShopeeFood Channel */}
          <ChannelDetailCard
            channel="shopeefood"
            amount={timeFilter === 'today' ? metrics.today_cash_inflow_by_channel?.shopeefood || 0 : metrics.cumulative_revenue_by_channel?.shopeefood || 0}
            timeFilter={timeFilter}
            channelMetrics={{
              fee: metrics.today_fee_shopeefood || 0,
              totalItems: metrics.today_total_items_sold || 0,
            }}
          />
          {/* GoFood Channel */}
          <ChannelDetailCard
            channel="gofood"
            amount={timeFilter === 'today' ? metrics.today_cash_inflow_by_channel?.gofood || 0 : metrics.cumulative_revenue_by_channel?.gofood || 0}
            timeFilter={timeFilter}
            channelMetrics={{
              fee: metrics.today_fee_gofood || 0,
              totalItems: metrics.today_total_items_sold || 0,
            }}
          />
        </div>
      </div>

      {/* SECTION 4: Cash Flow Tracking */}
      <div>
        <h2 className="text-lg font-semibold mb-4">💰 Arus Kas</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Cash Masuk Total</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-700">Rp {(timeFilter === 'today' ? metrics.today_cash_inflow || 0 : metrics.cumulative_cash_inflow || 0).toLocaleString('id-ID')}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Cash Keluar Total</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-red-700">Rp {(timeFilter === 'today' ? metrics.today_cash_outflow || 0 : metrics.cumulative_cash_outflow || 0).toLocaleString('id-ID')}</span>
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
      </div>

      {/* SECTION 5: Pengeluaran per Kategori */}
      <div>
        <h2 className="text-lg font-semibold mb-4">💸 Pengeluaran per Kategori</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bahan */}
          <Card
            className="border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              if (timeFilter === 'today') {
                setSelectedCategory('bahan');
                setIsModalOpen(true);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Bahan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-blue-700">
                  Rp {(timeFilter === 'today' ? metrics.today_expense_by_category?.bahan || 0 : metrics.cumulative_expense_by_category?.bahan || 0).toLocaleString('id-ID')}
                </span>
                {timeFilter === 'today' && <ChevronRight className="w-4 h-4 text-blue-600" />}
              </div>
            </CardContent>
          </Card>

          {/* Operasional */}
          <Card
            className="border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              if (timeFilter === 'today') {
                setSelectedCategory('operasional');
                setIsModalOpen(true);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Operasional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-orange-700">
                  Rp {(timeFilter === 'today' ? metrics.today_expense_by_category?.operasional || 0 : metrics.cumulative_expense_by_category?.operasional || 0).toLocaleString('id-ID')}
                </span>
                {timeFilter === 'today' && <ChevronRight className="w-4 h-4 text-orange-600" />}
              </div>
            </CardContent>
          </Card>

          {/* Peralatan */}
          <Card
            className="border-yellow-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              if (timeFilter === 'today') {
                setSelectedCategory('peralatan');
                setIsModalOpen(true);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-700">Peralatan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-yellow-700">
                  Rp {(timeFilter === 'today' ? metrics.today_expense_by_category?.peralatan || 0 : metrics.cumulative_expense_by_category?.peralatan || 0).toLocaleString('id-ID')}
                </span>
                {timeFilter === 'today' && <ChevronRight className="w-4 h-4 text-yellow-600" />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts & Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueByChannelChart data={metrics.today_revenue_by_channel || { offline: 0, shopeefood: 0, gofood: 0 }} />
        <PaymentMethodChart data={metrics.today_payment_methods || { cash: 0, qris: 0 }} />
      </div>

      {/* Daily Profit Chart */}
      <DailyProfitChart data={metrics.weekly_profit || []} />

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
