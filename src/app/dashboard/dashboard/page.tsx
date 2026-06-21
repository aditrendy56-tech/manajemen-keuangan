'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingCart, Zap, ChevronRight, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardMetrics } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

const RevenueByChannelChart = dynamic(
  () => import('@/components/charts/RevenueByChannelChart').then((mod) => mod.RevenueByChannelChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse" /> }
);
const PaymentMethodChart = dynamic(
  () => import('@/components/charts/PaymentMethodChart').then((mod) => mod.PaymentMethodChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse" /> }
);
const DailyProfitChart = dynamic(
  () => import('@/components/charts/DailyProfitChart').then((mod) => mod.DailyProfitChart),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse" /> }
);
const ExpenseDetailsModal = dynamic(
  () => import('@/components/modals/ExpenseDetailsModal').then((mod) => mod.ExpenseDetailsModal),
  { ssr: false }
);
const DualBucketFinancialDisplay = dynamic(
  () => import('@/components/dashboard/DualBucketFinancialDisplay').then((mod) => mod.DualBucketFinancialDisplay),
  { ssr: false, loading: () => <Card className="h-32 animate-pulse" /> }
);
const KasUtamaTracking = dynamic(
  () => import('@/components/dashboard/KasUtamaTracking').then((mod) => mod.KasUtamaTracking),
  { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50" /> }
);


// Channel Detail Card Component
const ChannelDetailCard = memo(function ChannelDetailCard({
  channel,
  amount,
  timeFilter,
  channelMetrics,
}: {
  channel: 'offline' | 'shopeefood' | 'gofood';
  amount: number;
  timeFilter: 'today' | 'cumulative';
  channelMetrics: { cash?: number; qris?: number; fee?: number; totalItems?: number };
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
            Pilih Hari Ini untuk melihat detail breakdown
          </div>
        )}
      </CardContent>
    </Card>
  );
});

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-36 animate-pulse rounded-full bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-1/2 rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'cumulative'>('today');
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<null | {
    title: string;
    description: string;
    rows: Array<{ label: string; value: string; percentage?: number }>;}
  >(null);
  const { outletId } = useOutlet();

  const persistMetrics = useCallback((value: DashboardMetrics) => {
    if (typeof window === 'undefined' || !outletId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `dashboard-metrics:${outletId}:${today}`;
      window.localStorage.setItem(cacheKey, JSON.stringify({ metrics: value, cachedAt: Date.now() }));
    } catch (error) {
      console.warn('Failed to cache dashboard metrics:', error);
    }
  }, [outletId]);

  const readCachedMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !outletId) return null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `dashboard-metrics:${outletId}:${today}`;
      const cached = window.localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as { metrics?: DashboardMetrics; cachedAt?: number };
      if (!parsed.metrics || typeof parsed.cachedAt !== 'number') return null;

      const isFresh = Date.now() - parsed.cachedAt < 5 * 60 * 1000;
      return isFresh ? parsed.metrics : null;
    } catch (error) {
      console.warn('Failed to read cached dashboard metrics:', error);
      return null;
    }
  }, [outletId]);

  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/dashboard?outlet_id=${outletId}&date=${today}`, { signal });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      if (!signal?.aborted) {
        setMetrics(data);
        persistMetrics(data);
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return;
      }

      console.error('Failed to fetch metrics:', error);
      if (!signal?.aborted) {
        const cachedMetrics = readCachedMetrics();
        if (cachedMetrics) {
          setMetrics(cachedMetrics);
        } else {
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
        }
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [outletId, persistMetrics, readCachedMetrics]);

  useEffect(() => {
    if (!outletId) {
      setLoading(false);
      return;
    }

    const cachedMetrics = readCachedMetrics();
    if (cachedMetrics) {
      setMetrics(cachedMetrics);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void fetchMetrics(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchMetrics, outletId, readCachedMetrics]);

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (!metrics) {
    return <div className="text-center py-8 text-red-600">Gagal memuat data</div>;
  }

  const activeGrossRevenue = timeFilter === 'today' ? metrics.today_gross_revenue || 0 : metrics.cumulative_gross_revenue || 0;
  const activeNetRevenue = timeFilter === 'today' ? metrics.today_pendapatan_bersih || 0 : metrics.cumulative_pendapatan_bersih || 0;
  const activeProfit = timeFilter === 'today' ? metrics.today_profit || 0 : metrics.cumulative_profit || 0;
  const activeItemsSold = timeFilter === 'today' ? metrics.today_total_items_sold || 0 : metrics.cumulative_total_items_sold || 0;
  const activeOperationalExpenses = timeFilter === 'today' ? metrics.today_operational_expenses || 0 : metrics.cumulative_operational_expenses || 0;
  const activeHpp = timeFilter === 'today' ? metrics.today_total_hpp || 0 : metrics.cumulative_total_hpp || 0;
  const activeRevenueByChannel = timeFilter === 'today' ? metrics.today_revenue_by_channel || { offline: 0, shopeefood: 0, gofood: 0 } : metrics.cumulative_revenue_by_channel || { offline: 0, shopeefood: 0, gofood: 0 };

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);

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
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendapatan Kotor
              </CardTitle>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMetricDetail({
                    title: 'Pendapatan Kotor',
                    description: 'Total penjualan sebelum dikurangi HPP atau biaya operasional.',
                    rows: [
                      { label: 'Offline', value: formatCurrency(activeRevenueByChannel.offline || 0), percentage: activeGrossRevenue > 0 ? ((activeRevenueByChannel.offline || 0) / activeGrossRevenue) * 100 : 0 },
                      { label: 'ShopeeFood', value: formatCurrency(activeRevenueByChannel.shopeefood || 0), percentage: activeGrossRevenue > 0 ? ((activeRevenueByChannel.shopeefood || 0) / activeGrossRevenue) * 100 : 0 },
                      { label: 'GoFood', value: formatCurrency(activeRevenueByChannel.gofood || 0), percentage: activeGrossRevenue > 0 ? ((activeRevenueByChannel.gofood || 0) / activeGrossRevenue) * 100 : 0 },
                      { label: 'Total', value: formatCurrency(activeGrossRevenue), percentage: 100 },
                    ],
                  });
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Detail
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">Rp {activeGrossRevenue.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendapatan Bersih
              </CardTitle>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMetricDetail({
                    title: 'Pendapatan Bersih',
                    description: 'Pendapatan kotor dikurangi HPP dari item yang terjual.',
                    rows: [
                      { label: 'Pendapatan kotor', value: formatCurrency(activeGrossRevenue), percentage: 100 },
                      { label: 'HPP', value: formatCurrency(activeHpp), percentage: activeGrossRevenue > 0 ? (activeHpp / activeGrossRevenue) * 100 : 0 },
                      { label: 'Pendapatan bersih', value: formatCurrency(activeNetRevenue), percentage: activeGrossRevenue > 0 ? (activeNetRevenue / activeGrossRevenue) * 100 : 0 },
                    ],
                  });
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Detail
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">Rp {activeNetRevenue.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Profit
              </CardTitle>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMetricDetail({
                    title: 'Profit',
                    description: 'Pendapatan bersih dikurangi biaya operasional.',
                    rows: [
                      { label: 'Pendapatan bersih', value: formatCurrency(activeNetRevenue), percentage: 100 },
                      { label: 'Operasional', value: formatCurrency(activeOperationalExpenses), percentage: activeNetRevenue > 0 ? (activeOperationalExpenses / activeNetRevenue) * 100 : 0 },
                      { label: 'Profit', value: formatCurrency(activeProfit), percentage: activeNetRevenue > 0 ? (activeProfit / activeNetRevenue) * 100 : 0 },
                    ],
                  });
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Detail
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold">Rp {activeProfit.toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Jumlah Item Terjual
              </CardTitle>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMetricDetail({
                    title: 'Item Terjual',
                    description: 'Total kuantitas item dari transaksi penjualan.',
                    rows: [
                      { label: 'Total item', value: activeItemsSold.toString() },
                    ],
                  });
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Detail
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold">{activeItemsSold}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 💰 SECTION 2: DUAL-BUCKET FINANCIAL SYSTEM (PHASE 3) */}
      <DualBucketFinancialDisplay outletId={outletId} />

      {/* 💰 SECTION 2.5: KAS UTAMA TRACKING BREAKDOWN (PHASE 2) */}
      {outletId && (
        <KasUtamaTracking outletId={outletId} />
      )}

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

      <Dialog open={Boolean(selectedMetricDetail)} onOpenChange={() => setSelectedMetricDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedMetricDetail?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 border-l-4 border-blue-400 pl-3">{selectedMetricDetail?.description}</p>
            <div className="space-y-2">
              {selectedMetricDetail?.rows.map((row, idx) => {
                const isTotal = idx === (selectedMetricDetail.rows.length - 1);
                return (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                      isTotal
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200'
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${ isTotal ? 'text-green-800' : 'text-gray-700' }`}>
                        {row.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${ isTotal ? 'text-green-700 text-lg' : 'text-gray-900' }`}>
                        {row.value}
                      </p>
                      {row.percentage !== undefined && (
                        <p className={`text-xs font-semibold ${ isTotal ? 'text-green-600' : 'text-blue-600' }`}>
                          {row.percentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
