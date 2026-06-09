'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProfitDetail {
  gross_revenue?: number;
  operational_expenses?: number;
  daily_revenue_by_channel?: Record<string, number>;
  daily_expenses_detailed?: Array<{ description: string; amount: number; category: string }>;
  total_gross_revenue?: number;
  total_operational_expenses?: number;
  cumulative_revenue_by_channel?: Record<string, number>;
  cumulative_expenses_by_category?: Record<string, number>;
  daily_breakdown?: Array<{ date: string; profit: number; gross_revenue: number }>;
  average_daily_profit?: number;
}

interface ProfitToggleCardProps {
  todayProfit: number;
  totalProfitCumulative: number;
  profitDetail?: ProfitDetail;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function ProfitToggleCard({
  todayProfit,
  totalProfitCumulative,
  profitDetail = {},
}: ProfitToggleCardProps) {
  const [showDaily, setShowDaily] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const displayValue = showDaily ? todayProfit : totalProfitCumulative;
  const displayLabel = showDaily
    ? 'Profit operasional harian'
    : 'Total profit dari awal bisnis';

  const isNegative = displayValue < 0;

  return (
    <Card
      className={`border-l-4 ${
        isNegative ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500 bg-blue-50'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className={`text-sm font-semibold ${isNegative ? 'text-red-700' : 'text-blue-700'}`}>
            📊 Laba
          </CardTitle>

          {/* Toggle Buttons */}
          <div className="flex gap-1 bg-white rounded-lg p-1 border shadow-sm">
            <button
              onClick={() => setShowDaily(true)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                showDaily
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setShowDaily(false)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                !showDaily
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Total
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {/* Main Value */}
        <div className="mb-1">
          <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(Math.abs(displayValue))}
          </p>
          {isNegative && <span className="text-xs text-red-600 font-medium">Rugi</span>}
        </div>
        <p className="text-sm text-gray-600 mb-3">{displayLabel}</p>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Detail Breakdown
        </button>

        {/* Expandable Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {showDaily ? (
              // DAILY DETAIL
              <div className="space-y-3 text-sm">
                {/* Revenue Breakdown */}
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-700 mb-2">📈 Penjualan Hari Ini</p>
                  <p className="text-lg font-bold text-green-600 mb-2">
                    {formatCurrency(profitDetail.gross_revenue || 0)}
                  </p>
                  <div className="space-y-1 text-xs">
                    {profitDetail.daily_revenue_by_channel && (
                      <>
                        {(profitDetail.daily_revenue_by_channel as any).offline > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Offline</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.daily_revenue_by_channel as any).offline)}
                            </span>
                          </div>
                        )}
                        {(profitDetail.daily_revenue_by_channel as any).shopeefood > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shopeefood</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.daily_revenue_by_channel as any).shopeefood)}
                            </span>
                          </div>
                        )}
                        {(profitDetail.daily_revenue_by_channel as any).gofood > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gofood</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.daily_revenue_by_channel as any).gofood)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Operational Breakdown */}
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-700 mb-2">📉 Operasional Hari Ini</p>
                  <p className="text-lg font-bold text-red-600 mb-2">
                    {formatCurrency(profitDetail.operational_expenses || 0)}
                  </p>
                  <div className="space-y-1 text-xs">
                    {profitDetail.daily_expenses_detailed && profitDetail.daily_expenses_detailed.length > 0 ? (
                      profitDetail.daily_expenses_detailed.map((exp, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-600 truncate">{exp.description}</span>
                          <span className="font-medium flex-shrink-0 ml-2">
                            {formatCurrency(exp.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">Tidak ada pengeluaran operasional</p>
                    )}
                  </div>
                </div>

                {/* Calculation */}
                <div className={`${isNegative ? 'bg-red-100 border-l-2 border-red-600' : 'bg-green-100 border-l-2 border-green-600'} p-3 rounded`}>
                  <p className="text-xs text-gray-600 mb-1">= Profit Hari Ini</p>
                  <p className={`font-bold text-lg ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(displayValue))}
                  </p>
                </div>
              </div>
            ) : (
              // CUMULATIVE DETAIL
              <div className="space-y-3 text-sm">
                {/* Total Revenue */}
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-700 mb-2">📈 Total Penjualan (dari awal)</p>
                  <p className="text-lg font-bold text-green-600 mb-2">
                    {formatCurrency(profitDetail.total_gross_revenue || 0)}
                  </p>
                  <div className="space-y-1 text-xs">
                    {profitDetail.cumulative_revenue_by_channel && (
                      <>
                        {(profitDetail.cumulative_revenue_by_channel as any).offline > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Offline</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.cumulative_revenue_by_channel as any).offline)}
                            </span>
                          </div>
                        )}
                        {(profitDetail.cumulative_revenue_by_channel as any).shopeefood > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shopeefood</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.cumulative_revenue_by_channel as any).shopeefood)}
                            </span>
                          </div>
                        )}
                        {(profitDetail.cumulative_revenue_by_channel as any).gofood > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gofood</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.cumulative_revenue_by_channel as any).gofood)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Total Operational */}
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-700 mb-2">📉 Total Operasional (dari awal)</p>
                  <p className="text-lg font-bold text-red-600 mb-2">
                    {formatCurrency(profitDetail.total_operational_expenses || 0)}
                  </p>
                  <div className="space-y-1 text-xs">
                    {profitDetail.cumulative_expenses_by_category && (
                      <>
                        {(profitDetail.cumulative_expenses_by_category as any).operasional > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Operasional</span>
                            <span className="font-medium">
                              {formatCurrency((profitDetail.cumulative_expenses_by_category as any).operasional)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Total Profit */}
                <div className={`${isNegative ? 'bg-red-100 border-l-2 border-red-600' : 'bg-green-100 border-l-2 border-green-600'} p-3 rounded`}>
                  <p className="text-xs text-gray-600 mb-1">= Total Profit</p>
                  <p className={`font-bold text-lg ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(displayValue))}
                  </p>
                </div>

                {/* Average Daily */}
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-semibold text-gray-700 mb-2">📊 Rata-rata Profit per Hari</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(profitDetail.average_daily_profit || 0)}
                  </p>
                </div>

                {/* Daily Breakdown */}
                {profitDetail.daily_breakdown && profitDetail.daily_breakdown.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-semibold text-gray-700 mb-2">📈 Performa Harian (7 hari terakhir)</p>
                    <div className="space-y-1 text-xs">
                      {profitDetail.daily_breakdown.map((day) => (
                        <div key={day.date} className="flex justify-between items-center">
                          <span className="text-gray-600">{day.date}</span>
                          <span
                            className={`font-medium ${
                              day.profit < 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {day.profit < 0 ? '-' : '+'}
                            {formatCurrency(Math.abs(day.profit))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
