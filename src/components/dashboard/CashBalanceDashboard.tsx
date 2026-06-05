'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CashBalanceData {
  totalCapitalIn: number;
  totalExpenses: number;
  totalSales: number;
  totalRefunds: number;
  availableCash: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

interface CashBalanceDashboardProps {
  outletId: string;
  refreshTrigger?: number;
}

export function CashBalanceDashboard({ outletId, refreshTrigger = 0 }: CashBalanceDashboardProps) {
  const [balance, setBalance] = useState<CashBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, [outletId, refreshTrigger]);

  async function fetchBalance() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/cash/balance?outlet_id=${outletId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal load cash balance');
      }
      
      setBalance(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!balance) return null;

  const statusIcon = {
    healthy: <CheckCircle className="w-5 h-5 text-green-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    critical: <AlertCircle className="w-5 h-5 text-red-600" />,
  };

  const statusColor = {
    healthy: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
  };

  const statusBadgeVariant = {
    healthy: 'default' as const,
    warning: 'secondary' as const,
    critical: 'destructive' as const,
  };

  return (
    <div className="space-y-4">
      {/* Main Alert */}
      {balance.status !== 'healthy' && (
        <Alert className={`border ${statusColor[balance.status]}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {balance.status === 'critical' ? '⚠️ CRITICAL: Kas Minus!' : '⚠️ Perhatian'}
          </AlertTitle>
          <AlertDescription className="mt-2 whitespace-pre-wrap text-sm">
            {balance.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className={`border ${statusColor[balance.status]}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {statusIcon[balance.status]}
              Status Kas Operasional
            </CardTitle>
            <Badge variant={statusBadgeVariant[balance.status]}>
              {balance.status === 'healthy' ? 'Sehat' : balance.status === 'warning' ? 'Warning' : 'Critical'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Modal */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">💰 Total Modal Masuk</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(balance.totalCapitalIn)}
              </p>
            </div>

            {/* Total Penjualan */}
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">📊 Total Penjualan</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(balance.totalSales)}
              </p>
            </div>

            {/* Total Pengeluaran */}
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">💸 Total Pengeluaran</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(balance.totalExpenses)}
              </p>
            </div>

            {/* Available Cash */}
            <div className={`p-3 rounded-lg ${
              balance.availableCash < 0 
                ? 'bg-red-100' 
                : balance.availableCash < 100000
                ? 'bg-yellow-100'
                : 'bg-green-100'
            }`}>
              <p className="text-xs text-gray-600 mb-1">💵 Kas Tersedia</p>
              <p className={`text-lg font-semibold ${
                balance.availableCash < 0
                  ? 'text-red-700'
                  : balance.availableCash < 100000
                  ? 'text-yellow-700'
                  : 'text-green-700'
              }`}>
                {formatCurrency(balance.availableCash)}
              </p>
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-semibold mb-3">Perhitungan:</p>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span>Modal Masuk:</span>
                <span className="text-blue-600 font-semibold">+{formatCurrency(balance.totalCapitalIn)}</span>
              </div>
              <div className="flex justify-between">
                <span>Penjualan (net):</span>
                <span className="text-green-600 font-semibold">+{formatCurrency(balance.totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pengeluaran (net):</span>
                <span className="text-red-600 font-semibold">-{formatCurrency(balance.totalExpenses)}</span>
              </div>
              {balance.totalRefunds > 0 && (
                <div className="flex justify-between p-2 bg-amber-50 rounded text-amber-800">
                  <span>💸 Refund Dikembalikan:</span>
                  <span className="font-semibold">+{formatCurrency(balance.totalRefunds)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-bold">
                <span>Kas Tersedia:</span>
                <span className={balance.availableCash < 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(balance.availableCash)}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {balance.status !== 'healthy' && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-semibold mb-3">Rekomendasi:</p>
              <ul className="text-sm space-y-2 list-disc list-inside text-gray-700">
                {balance.status === 'critical' && (
                  <>
                    <li>Segera injeksi modal dari owner untuk menutupi minus</li>
                    <li>Tunda pengeluaran non-urgent sampai modal masuk</li>
                    <li>Review semua transaksi kemarin untuk pastikan tidak ada error input</li>
                  </>
                )}
                {balance.status === 'warning' && (
                  <>
                    <li>Siapkan injeksi modal jika akan ada pengeluaran besar</li>
                    <li>Fokus meningkatkan penjualan untuk tambah kas operasional</li>
                    <li>Pastikan stok bahan cukup agar tidak perlu belanja darurat</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
