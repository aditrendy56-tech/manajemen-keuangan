'use client';

import { useEffect, useState } from 'react';
import { useOutlet } from '@/lib/context/OutletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BukuClosingsTable } from '@/components/tables/BukuClosingsTable';
import { AllocationChangeModal } from '@/components/modals/AllocationChangeModal';
import { BarChart3, AlertCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

interface Closing {
  id: string;
  period_id: string;
  periods?: { period_month: string };
  total_revenue: number;
  total_sales_transactions: number;
  allocated_operational_buffer: number;
  actual_operational_spent: number;
  variance: number;
  variance_percent: number;
  allocation_changed: boolean;
  closed_at: string;
  closed_by?: string;
}

interface Stats {
  total_closed: number;
  avg_variance_percent: number;
  trend: 'improving' | 'declining' | 'stable';
  total_revenue_all: number;
}

export default function ClosingsPage() {
  const { outletId } = useOutlet();
  const [closings, setClosings] = useState<Closing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState<Closing | null>(null);

  useEffect(() => {
    if (outletId) {
      loadClosings();
    }
  }, [outletId]);

  const loadClosings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/buku-closings?outlet_id=${outletId}`);
      if (!response.ok) throw new Error('Gagal load data closings');

      const data = await response.json();
      const closingsList = data.closings || [];

      setClosings(closingsList);

      // Calculate stats
      if (closingsList.length > 0) {
        const avgVariance =
          closingsList.reduce((sum: number, c: any) => sum + (c.variance_percent || 0), 0) / closingsList.length;
        const totalRevenue = closingsList.reduce((sum: number, c: any) => sum + (c.total_revenue || 0), 0);

        // Determine trend (last 3 vs prev 3)
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (closingsList.length >= 6) {
          const last3Avg =
            closingsList.slice(0, 3).reduce((sum: number, c: any) => sum + (c.variance_percent || 0), 0) / 3;
          const prev3Avg =
            closingsList.slice(3, 6).reduce((sum: number, c: any) => sum + (c.variance_percent || 0), 0) / 3;
          trend = last3Avg > prev3Avg ? 'improving' : last3Avg < prev3Avg ? 'declining' : 'stable';
        }

        setStats({
          total_closed: closingsList.length,
          avg_variance_percent: avgVariance,
          trend,
          total_revenue_all: totalRevenue,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailClick = (closing: Closing) => {
    setSelectedClosing(closing);
  };

  const handleAllocationChange = () => {
    setAllocationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Riwayat Tutup Buku
          </h1>
          <p className="text-gray-600 mt-1">Kelola periode yang sudah ditutup dan analisis variance</p>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Periode Ditutup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total_closed}</p>
              <p className="text-xs text-gray-500 mt-1">periode selesai</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue_all)}</p>
              <p className="text-xs text-gray-500 mt-1">semua periode</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rata-rata Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats.avg_variance_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.avg_variance_percent.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">efisiensi operasional</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Trend 3 Bulan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold flex items-center gap-2 ${
                stats.trend === 'improving' ? 'text-green-600' :
                stats.trend === 'declining' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                <TrendingUp className="w-4 h-4" />
                {stats.trend === 'improving' ? 'Meningkat' : stats.trend === 'declining' ? 'Menurun' : 'Stabil'}
              </p>
              <p className="text-xs text-gray-500 mt-1">perbandingan 3 bulan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Allocation Change Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-2">
          <strong>Adaptive Allocation:</strong> Jika telah memasuki bulan ke-3 dan variance lebih dari ±10%, sistem merekomendasikan perubahan alokasi dari 60-40 menjadi 40-60.
          <Button
            variant="link"
            className="ml-2 p-0 h-auto font-bold text-blue-900 underline"
            onClick={handleAllocationChange}
          >
            Ubah Alokasi Sekarang
          </Button>
        </AlertDescription>
      </Alert>

      {/* Closings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Tutup Buku</CardTitle>
            <Button
              onClick={() => loadClosings()}
              variant="outline"
            >
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BukuClosingsTable
            closings={closings}
            loading={loading}
            onDetailClick={handleDetailClick}
          />
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {selectedClosing && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle>Detail Tutup Buku: {selectedClosing.periods?.period_month}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedClosing.total_revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Alokasi Buffer</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(selectedClosing.allocated_operational_buffer)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Aktual Belanja</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(selectedClosing.actual_operational_spent)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Variance</p>
                <div>
                  <p className={`text-3xl font-bold ${selectedClosing.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedClosing.variance)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ({selectedClosing.variance_percent.toFixed(2)}% dari revenue)
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Informasi Tutup</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <strong>Waktu:</strong> {new Date(selectedClosing.closed_at).toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm">
                    <strong>Ditutup oleh:</strong> {selectedClosing.closed_by || 'System'}
                  </p>
                  <p className="text-sm">
                    <strong>Transaksi:</strong> {selectedClosing.total_sales_transactions} sesi
                  </p>
                </div>
              </div>
            </div>

            {selectedClosing.allocation_changed && (
              <Alert className="mt-4 border-purple-200 bg-purple-50">
                <AlertDescription className="text-purple-800">
                  ⚠️ <strong>Alokasi berubah pada periode ini</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Allocation Change Modal */}
      <AllocationChangeModal
        open={allocationModalOpen}
        onOpenChange={setAllocationModalOpen}
        outletId={outletId || ''}
        currentAllocation={{ kas_utama_percent: 60, profit_pending_percent: 40 }}
        recommendedAllocation={
          stats && stats.avg_variance_percent > 10
            ? {
                kas_utama_percent: 40,
                profit_pending_percent: 60,
                reasoning:
                  'Berdasarkan variance analysis 3 bulan terakhir menunjukkan surplus operasional. Sistem merekomendasikan flip ke 40-60 untuk lebih fokus pada profit allocation.',
              }
            : undefined
        }
        onSuccess={loadClosings}
      />
    </div>
  );
}
