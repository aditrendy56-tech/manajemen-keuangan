'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface KasTrackingData {
  outlet_id: string;
  month: string;
  current_balance: number;
  sources: {
    capital_input: { label: string; total_amount: number; transactions: any[] };
    sales: { label: string; total_amount: number; transactions: any[] };
    allocation_profit: { label: string; total_amount: number; transactions: any[] };
  };
  outflows: {
    expenses: { label: string; total_amount: number; transactions: any[] };
    allocation_cicilan: { label: string; total_amount: number; transactions: any[] };
  };
  net_flow: number;
  calculation_breakdown: {
    opening_balance: number;
    plus_sources: number;
    minus_outflows: number;
    closing_balance: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

export function KasUtamaTracking({ outletId, month }: { outletId: string; month?: string }) {
  const [data, setData] = useState<KasTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const monthParam = month || new Date().toISOString().substring(0, 7);
      const response = await fetch(`/api/cash/kas-utama-tracking?outlet_id=${outletId}&month=${monthParam}`);
      if (!response.ok) throw new Error('Failed to fetch kas utama tracking');
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (outletId) {
      fetchData();
    }
  }, [outletId, month]);

  if (loading) return <div className="text-center py-8">Memuat...</div>;
  if (error) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const totalSources = data.sources.capital_input.total_amount + data.sources.sales.total_amount + data.sources.allocation_profit.total_amount;
  const totalOutflows = data.outflows.expenses.total_amount + data.outflows.allocation_cicilan.total_amount;

  return (
    <div className="space-y-4">
      {/* Tracking Cash Header - Expandable */}
      <Card 
        className="cursor-pointer border-purple-300 hover:bg-purple-50 transition-colors"
        onClick={() => setIsTrackingExpanded(!isTrackingExpanded)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>📊 TRACKING KAS UTAMA</span>
            </CardTitle>
            {isTrackingExpanded ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </div>
        </CardHeader>

        {/* Collapsed Summary View */}
        {!isTrackingExpanded && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-gray-600 text-xs mb-1">💰 Saldo Saat Ini</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(data.current_balance)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-gray-600 text-xs mb-1">📥 Total Sumber</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalSources)}</p>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-gray-600 text-xs mb-1">📤 Total Keluaran</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalOutflows)}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="text-gray-600 text-xs mb-1">Per {data.month}</p>
                <p className="text-xs text-gray-500">Klik untuk detail →</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Expanded Detailed View */}
      {isTrackingExpanded && (
        <>
          {/* Main Balance Card */}
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">💰 Saldo Kas Utama Saat Ini</p>
                <p className="text-4xl font-bold text-blue-600">{formatCurrency(data.current_balance)}</p>
                <p className="text-xs text-gray-500 mt-2">Per {data.month}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sources Section */}
          <Card className="border-green-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-600" /> 📥 SUMBER KAS
              </CardTitle>
              <p className="text-sm text-gray-600">Total: {formatCurrency(totalSources)}</p>
              <p className="text-xs text-gray-500">Penjualan bersih masuk ke Kas Utama 60% dan Profit Pending 40%.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Capital Input */}
              <div
                className="p-4 bg-white rounded border-2 border-green-200 cursor-pointer hover:bg-green-50"
                onClick={() => setExpandedSection(expandedSection === 'capital' ? null : 'capital')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-green-700">{data.sources.capital_input.label}</p>
                    <p className="text-xs text-gray-500">Modal dari investor/owner</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(data.sources.capital_input.total_amount)}</p>
                </div>
                {expandedSection === 'capital' && data.sources.capital_input.transactions.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {data.sources.capital_input.transactions.map((tx, idx) => (
                      <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                        <p className="font-mono font-semibold">{tx.date}</p>
                        {tx.items?.map((item: any, i: number) => (
                          <p key={i} className="text-gray-700">
                            • {item.investor}: {formatCurrency(item.amount)}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sales */}
              <div
                className="p-4 bg-white rounded border-2 border-green-200 cursor-pointer hover:bg-green-50"
                onClick={() => setExpandedSection(expandedSection === 'sales' ? null : 'sales')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-green-700">{data.sources.sales.label}</p>
                    <p className="text-xs text-gray-500">Dari penjualan produk</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(data.sources.sales.total_amount)}</p>
                </div>
                {expandedSection === 'sales' && data.sources.sales.transactions.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 italic">Belum ada transaksi penjualan</p>
                )}
              </div>

              {/* Allocation Profit */}
              <div
                className="p-4 bg-white rounded border-2 border-green-200 cursor-pointer hover:bg-green-50"
                onClick={() => setExpandedSection(expandedSection === 'allocation' ? null : 'allocation')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-green-700">{data.sources.allocation_profit.label}</p>
                    <p className="text-xs text-gray-500">Dari alokasi profit bulanan</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(data.sources.allocation_profit.total_amount)}</p>
                </div>
                {expandedSection === 'allocation' && data.sources.allocation_profit.transactions.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 italic">Belum ada alokasi</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Outflows Section */}
          <Card className="border-red-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="w-5 h-5 text-red-600" /> 📤 KELUARAN KAS
              </CardTitle>
              <p className="text-sm text-gray-600">Total: {formatCurrency(totalOutflows)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Expenses */}
              <div
                className="p-4 bg-white rounded border-2 border-red-200 cursor-pointer hover:bg-red-50"
                onClick={() => setExpandedSection(expandedSection === 'expenses' ? null : 'expenses')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-red-700">{data.outflows.expenses.label}</p>
                    <p className="text-xs text-gray-500">Operasional bisnis</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(data.outflows.expenses.total_amount)}</p>
                </div>
                {expandedSection === 'expenses' && data.outflows.expenses.transactions.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 italic">Belum ada pengeluaran</p>
                )}
              </div>

              {/* Cicilan Repayment */}
              <div
                className="p-4 bg-white rounded border-2 border-red-200 cursor-pointer hover:bg-red-50"
                onClick={() => setExpandedSection(expandedSection === 'cicilan' ? null : 'cicilan')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-red-700">{data.outflows.allocation_cicilan.label}</p>
                    <p className="text-xs text-gray-500">Pembayaran hutang cicilan</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(data.outflows.allocation_cicilan.total_amount)}</p>
                </div>
                {expandedSection === 'cicilan' && data.outflows.allocation_cicilan.transactions.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 italic">Belum ada pembayaran cicilan</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calculation Breakdown */}
          <Card className="border-orange-300 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg">🧮 PERHITUNGAN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Saldo Awal</span>
                  <span className="font-mono">{formatCurrency(data.calculation_breakdown.opening_balance)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>+ Sumber Kas</span>
                  <span className="font-mono">+ {formatCurrency(data.calculation_breakdown.plus_sources)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>- Keluaran Kas</span>
                  <span className="font-mono">- {formatCurrency(data.calculation_breakdown.minus_outflows)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>= Saldo Akhir</span>
                  <span className="font-mono text-blue-600">{formatCurrency(data.calculation_breakdown.closing_balance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refresh Button */}
          <Button onClick={fetchData} variant="outline" className="w-full" disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </>
      )}
    </div>
  );
}
