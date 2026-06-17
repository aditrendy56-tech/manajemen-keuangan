'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfitLossReport } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet, Eye, EyeOff } from 'lucide-react';

interface ReportsTableProps {
  report: ProfitLossReport;
}

export function ReportsTable({ report }: ReportsTableProps) {
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gross Revenue Card */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pendapatan Kotor</p>
                <p className="text-2xl font-bold text-green-700 mt-2">Rp {report.gross_revenue.toLocaleString('id-ID')}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Net Revenue Card */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pendapatan Bersih</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">Rp {report.net_revenue.toLocaleString('id-ID')}</p>
                <p className="text-xs text-slate-500 mt-1">Setelah HPP</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className={`border-l-4 ${report.gross_profit >= 0 ? 'border-l-emerald-500 bg-gradient-to-br from-emerald-50' : 'border-l-red-500 bg-gradient-to-br from-red-50'} to-white`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Laba Kotor</p>
                <p className={`text-2xl font-bold mt-2 ${report.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {report.gross_profit >= 0 ? '+' : '-'}Rp {Math.abs(report.gross_profit).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Marjin: <span className={report.profit_margin >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{report.profit_margin.toFixed(2)}%</span>
                </p>
              </div>
              {report.gross_profit >= 0 ? (
                <TrendingUp className="w-8 h-8 text-emerald-500 opacity-20" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REVENUE BREAKDOWN */}
      <Card className="border border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
            Rincian Pendapatan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50">
              <span className="font-medium text-slate-700">Pendapatan Kotor (Gross)</span>
              <span className="font-bold text-slate-900">Rp {report.gross_revenue.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50">
              <span className="text-slate-600">⊖ Biaya Platform (Fee)</span>
              <span className="font-semibold text-red-600">-Rp {report.platform_fees.toLocaleString('id-ID')}</span>
            </div>
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="font-bold text-blue-900">Pendapatan Bersih (Net)</span>
              <span className="font-bold text-lg text-blue-700">Rp {report.net_revenue.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EXPENSES BREAKDOWN */}
      <Card className="border border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-orange-600" />
            Rincian Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {report.expenses_by_category && Object.entries(report.expenses_by_category).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50">
                <span className="text-slate-600 capitalize">{category === 'operasional' ? 'Operasional' : category === 'bahan' ? 'Bahan Baku' : 'Peralatan'}</span>
                <span className="font-semibold text-orange-600">-Rp {amount.toLocaleString('id-ID')}</span>
              </div>
            ))}
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <span className="font-bold text-orange-900">Total Pengeluaran</span>
              <span className="font-bold text-lg text-orange-700">-Rp {report.total_expenses.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PROFIT SUMMARY */}
      <Card className={`border-l-4 ${report.gross_profit >= 0 ? 'border-l-emerald-600 bg-gradient-to-br from-emerald-50' : 'border-l-red-600 bg-gradient-to-br from-red-50'} to-white`}>
        <CardHeader className={`pb-3 ${report.gross_profit >= 0 ? 'bg-emerald-100/30' : 'bg-red-100/30'}`}>
          <CardTitle className="text-lg">Ringkasan Profit</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Laba Kotor (Gross Profit)</p>
                <p className={`text-2xl font-bold ${report.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {report.gross_profit >= 0 ? '+' : '-'}Rp {Math.abs(report.gross_profit).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-500 mt-2">Pendapatan Bersih - Total Pengeluaran</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Marjin Keuntungan</p>
                <p className={`text-2xl font-bold ${report.profit_margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {report.profit_margin.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-500 mt-2">Terhadap Pendapatan Kotor</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CASH ANALYSIS */}
      {(report.settled_cash_inflow !== undefined || report.settled_cash_outflow !== undefined) && (
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Analisis Kas (Cash Basis)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">Cash Inflow</p>
                <p className="text-2xl font-bold text-green-700">Rp {(report.settled_cash_inflow || 0).toLocaleString('id-ID')}</p>
                <p className="text-xs text-green-600 mt-2">Dana masuk yang sudah settled</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-2">Cash Outflow</p>
                <p className="text-2xl font-bold text-red-700">-Rp {(report.settled_cash_outflow || 0).toLocaleString('id-ID')}</p>
                <p className="text-xs text-red-600 mt-2">Dana keluar yang sudah settled</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-800 mb-2">Cash Basis Profit</p>
              <p className={`text-2xl font-bold ${(report.cash_basis_profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {(report.cash_basis_profit || 0) >= 0 ? '+' : '-'}Rp {Math.abs(report.cash_basis_profit || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-purple-600 mt-2">Profit berdasarkan kas yang sudah diterima dan dikeluarkan</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ONLINE FEE ANALYSIS */}
      {report.online_fee_analysis && report.online_fee_analysis.online_sales_count > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
            <CardTitle className="text-lg">Analisis Biaya Platform Online</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 mb-1">Total Calculated Total</p>
                <p className="text-lg font-bold text-amber-900">Rp {report.online_fee_analysis.total_calculated_total.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 mb-1">Total Fee Amount</p>
                <p className="text-lg font-bold text-red-900">Rp {report.online_fee_analysis.total_fee_amount.toLocaleString('id-ID')} ({report.online_fee_analysis.total_fee_percentage.toFixed(2)}%)</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-1">Total Net Revenue</p>
                <p className="text-lg font-bold text-blue-900">Rp {report.online_fee_analysis.total_net_revenue.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-300">
                <p className="text-sm text-slate-800 mb-1">Online Sales Count</p>
                <p className="text-lg font-bold text-slate-900">{report.online_fee_analysis.online_sales_count} transaksi</p>
              </div>
            </div>
            
            {/* Channel Breakdown */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Breakdown per Channel</p>
              <div className="space-y-2">
                {Object.entries(report.online_fee_analysis.by_channel).map(([channel, data]) => (
                  data.sales_count > 0 ? (
                    <div key={channel} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900 capitalize">{channel}</p>
                          <p className="text-xs text-slate-600 mt-1">{data.sales_count} transaksi</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">Rp {data.net_revenue.toLocaleString('id-ID')}</p>
                          <p className="text-xs text-red-600 mt-1">Fee: {data.fee_percentage.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TRANSACTION DETAILS */}
      {report.transaction_details && report.transaction_details.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50" onClick={() => setShowTransactionDetails((prev) => !prev)}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {showTransactionDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                Detail Transaksi Penjualan
              </CardTitle>
              <span className="text-sm text-slate-500">({report.transaction_details.length} transaksi)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Klik untuk menampilkan gross, fee, dan net per transaksi</p>
          </CardHeader>

          {showTransactionDetails && (
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Tanggal</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Channel</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Gross</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Fee</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Net</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">% Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.transaction_details.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-700">{new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="px-4 py-3 text-slate-700 capitalize"><span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs font-medium">{item.channel}</span></td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">Rp {item.gross_amount.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">-Rp {item.fee_amount.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">Rp {item.net_amount.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right text-amber-700 font-semibold">{item.fee_percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}