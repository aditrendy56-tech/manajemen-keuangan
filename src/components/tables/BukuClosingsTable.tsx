'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

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

interface BukuClosingsTableProps {
  closings: Closing[];
  loading?: boolean;
  onDetailClick?: (closing: Closing) => void;
}

export function BukuClosingsTable({ closings, loading = false, onDetailClick }: BukuClosingsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getVarianceBadge = (variance_percent: number) => {
    if (variance_percent > 10) {
      return <Badge className="bg-green-100 text-green-800">Surplus {formatPercent(variance_percent)}</Badge>;
    } else if (variance_percent < -10) {
      return <Badge className="bg-red-100 text-red-800">Deficit {formatPercent(variance_percent)}</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Normal {formatPercent(variance_percent)}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (closings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Belum ada periode yang ditutup</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {closings.map((closing) => (
        <Card key={closing.id} className="hover:shadow-md transition-shadow">
          <div className="p-4">
            <div className="grid grid-cols-7 gap-4 items-center">
              {/* Period */}
              <div>
                <p className="font-semibold text-lg">{closing.periods?.period_month || 'N/A'}</p>
                <p className="text-sm text-gray-500">
                  {new Date(closing.closed_at).toLocaleDateString('id-ID')}
                </p>
              </div>

              {/* Revenue */}
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="font-semibold">{formatCurrency(closing.total_revenue)}</p>
              </div>

              {/* Allocated Buffer */}
              <div>
                <p className="text-sm text-gray-500">Alokasi Kas</p>
                <p className="font-semibold">{formatCurrency(closing.allocated_operational_buffer)}</p>
              </div>

              {/* Actual Spent */}
              <div>
                <p className="text-sm text-gray-500">Aktual Belanja</p>
                <p className="font-semibold">{formatCurrency(closing.actual_operational_spent)}</p>
              </div>

              {/* Variance */}
              <div>
                <p className="text-sm text-gray-500">Variance</p>
                <div className="flex items-center gap-2">
                  {closing.variance >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-semibold">{formatCurrency(closing.variance)}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {getVarianceBadge(closing.variance_percent)}
                {closing.allocation_changed && (
                  <Badge className="bg-purple-100 text-purple-800 ml-2 mt-1">Alokasi Berubah</Badge>
                )}
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandedId(expandedId === closing.id ? null : closing.id);
                    onDetailClick?.(closing);
                  }}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedId === closing.id ? 'rotate-180' : ''}`}
                  />
                </Button>
              </div>
            </div>

            {/* Expanded Detail */}
            {expandedId === closing.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Transaksi</p>
                  <p className="font-semibold">{closing.total_sales_transactions} sesi</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ditutup oleh</p>
                  <p className="font-semibold">{closing.closed_by || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Variance %</p>
                  <p className={`font-semibold ${closing.variance_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(closing.variance_percent)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
