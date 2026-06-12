'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Lock, Unlock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PeriodInfoBannerProps {
  outletId: string;
  onTutupBukuClick?: () => void;
}

interface Period {
  id: string;
  period_month: string;
  period_start_date: string;
  period_end_date: string;
  status: 'active' | 'closed';
  is_locked: boolean;
}

interface AllocationRule {
  id: string;
  kas_utama_percent: number;
  profit_pending_percent: number;
}

export function PeriodInfoBanner({ outletId, onTutupBukuClick }: PeriodInfoBannerProps) {
  const [period, setPeriod] = useState<Period | null>(null);
  const [allocation, setAllocation] = useState<AllocationRule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeriodAndAllocation();
  }, [outletId]);

  async function fetchPeriodAndAllocation() {
    try {
      setLoading(true);
      
      // Fetch current period
      const periodRes = await fetch(`/api/periods?outlet_id=${outletId}&status=active`);
      const periodData = await periodRes.json();
      if (periodData.periods && periodData.periods.length > 0) {
        setPeriod(periodData.periods[0]);
      }

      // Fetch current allocation rule
      const allocRes = await fetch(`/api/allocation-rules?outlet_id=${outletId}`);
      const allocData = await allocRes.json();
      if (allocData && allocData.data) {
        setAllocation(allocData.data);
      }
    } catch (error) {
      console.error('Error fetching period/allocation:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!period) {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertDescription className="text-yellow-800">
          Tidak ada periode aktif untuk outlet ini.
        </AlertDescription>
      </Alert>
    );
  }

  // Check if today is the 5th (period close day)
  const today = new Date();
  const isTutupBukuDay = today.getDate() === 5;
  const canTutupBuku = isTutupBukuDay && period.status === 'active' && !period.is_locked;

  // Format dates
  const startDate = new Date(period.period_start_date);
  const endDate = new Date(period.period_end_date);
  const startStr = startDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = endDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Period Info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-600">Periode Aktif</p>
                <p className="text-lg font-bold">
                  {period.period_month} ({startStr} - {endStr})
                </p>
              </div>
            </div>

            {/* Lock Status */}
            <div className="flex items-center gap-2">
              {period.is_locked ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Terkunci</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <Unlock className="w-4 h-4" />
                  <span>Aktif</span>
                </div>
              )}
            </div>
          </div>

          {/* Allocation Split */}
          {allocation && (
            <div className="flex gap-4 pt-2 border-t">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Alokasi Kas Utama</p>
                <p className="text-2xl font-bold text-blue-600">
                  {allocation.kas_utama_percent.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">(Operasional)</p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Alokasi Profit Pending</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {allocation.profit_pending_percent.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">(Profit & Cicilan)</p>
              </div>

              {/* Tutup Buku Button */}
              {canTutupBuku && (
                <div className="flex items-end">
                  <Button
                    onClick={onTutupBukuClick}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    🔒 Tutup Buku Periode
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Info message if not tutup buku day */}
          {!canTutupBuku && !period.is_locked && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-sm text-blue-800">
                📅 Tombol "Tutup Buku" akan tersedia pada tanggal 5 bulan depan.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
