/**
 * RepaymentSummary Component
 * Phase 4 Dashboard Card
 *
 * Displays cicilan payment summary:
 * - Total allocated
 * - Total paid
 * - Outstanding
 * - Recent payments
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RepaymentSummaryProps {
  outletId: string;
  month?: string;
  refreshTrigger?: number;
}

interface RepaymentSummaryData {
  total_allocated?: number;
  total_paid?: number;
  recent_payments?: Array<{
    investor_name?: string;
    repayment_date?: string;
    amount_paid?: number;
    repayment_type?: string;
  }>;
}

export function RepaymentSummary({ outletId, month, refreshTrigger }: RepaymentSummaryProps) {
  const [data, setData] = useState<RepaymentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!outletId) return;

      setLoading(true);
      setError(null);

      try {
        const currentMonth = month || new Date().toISOString().slice(0, 7);

        // Fetch repayment tracking for the month
        const response = await fetch(
          `/api/repayment-tracking?outlet_id=${outletId}&month=${currentMonth}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch repayment summary');
        }

        const result = await response.json();
        setData(result);
      } catch {
        // Silently fail - data may not be available yet
        setError('Data tidak tersedia');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [outletId, month, refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading repayment summary...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Fail silently - don't show error to user for this non-critical dashboard card
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-400 text-sm">Data pembayaran tidak tersedia</div>
        </CardContent>
      </Card>
    );
  }

  const totalAllocated = data?.total_allocated || 0;
  const totalPaid = data?.total_paid || 0;
  const outstanding = Math.max(0, totalAllocated - totalPaid);
  const paymentPercentage = totalAllocated > 0 ? ((totalPaid / totalAllocated) * 100).toFixed(1) : 0;
  const recentPayments = data?.recent_payments || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📤 Ringkasan Pembayaran Cicilan
          <Badge variant="outline">Phase 4</Badge>
        </CardTitle>
        <CardDescription>
          Status pembayaran cicilan modal investor bulan ini
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Allocated */}
          <div className="border rounded-lg p-3 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 font-semibold">Alokasi Cicilan</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalAllocated)}</p>
          </div>

          {/* Total Paid */}
          <div className="border rounded-lg p-3 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 font-semibold">Sudah Dibayar</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          </div>

          {/* Outstanding */}
          <div className="border rounded-lg p-3 bg-orange-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 font-semibold">Sisa Cicilan</span>
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(outstanding)}</p>
          </div>

          {/* Percentage */}
          <div className="border rounded-lg p-3 bg-purple-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 font-semibold">Terbayar</span>
              <TrendingDown className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-700">{paymentPercentage}%</p>
          </div>
        </div>

        {/* Recent Payments */}
        {recentPayments && recentPayments.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3">Pembayaran Terbaru</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentPayments.slice(0, 5).map((payment, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 rounded border border-gray-100">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-700">
                      {payment.investor_name || 'Investor'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(payment.repayment_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(payment.amount_paid)}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        payment.repayment_type === 'cicilan' ? 'bg-orange-50' : 'bg-green-50'
                      }`}
                    >
                      {payment.repayment_type === 'cicilan' ? 'Cicilan' : 'Lunas'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {outstanding === 0 && totalAllocated > 0 && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            <p className="text-green-700">✅ Semua cicilan sudah terbayar! Mantap!</p>
          </div>
        )}

        {outstanding > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <p className="text-yellow-700">⚠️ Masih ada {formatCurrency(outstanding)} cicilan yang harus dibayar</p>
          </div>
        )}

        {totalAllocated === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
            <p className="text-gray-600">💡 Belum ada alokasi cicilan bulan ini. Mulai dari tab "Alokasi Laba"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
