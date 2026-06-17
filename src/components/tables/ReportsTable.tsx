'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfitLossReport } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet, ChevronDown, ChevronRight, Calendar, Tag } from 'lucide-react';

interface ReportsTableProps {
  report: ProfitLossReport;
}

type ExpandedState = Record<string, boolean>;

export function ReportsTable({ report }: ReportsTableProps) {
  const [expandedExpenseCategories, setExpandedExpenseCategories] = useState<ExpandedState>({});
  const [expandedChannels, setExpandedChannels] = useState<ExpandedState>({});

  const toggleExpenseCategory = (category: string) => {
    setExpandedExpenseCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleChannel = (channel: string) => {
    setExpandedChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  // Group expense details by category
  const expensesByCategory = report.expense_details?.reduce((acc, expense) => {
    const category = expense.category || 'operasional';
    if (!acc[category]) acc[category] = [];
    acc[category].push(expense);
    return acc;
  }, {} as Record<string, typeof report.expense_details>) || {};

  // Group transaction details by channel
  const transactionsByChannel = report.transaction_details?.reduce((acc, transaction) => {
    const channel = transaction.channel || 'offline';
    if (!acc[channel]) acc[channel] = [];
    acc[channel].push(transaction);
    return acc;
  }, {} as Record<string, typeof report.transaction_details>) || {};

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'operasional': 'Operasional',
      'bahan': 'Bahan Baku',
      'peralatan': 'Peralatan',
    };
    return labels[category] || category;
  };

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

            {/* MOVE: Expanded per-channel transaction summary into revenue details */}
            {report.transaction_details && report.transaction_details.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Rincian Penjualan (per Channel)</p>
                <div className="space-y-4">
                  {Object.entries(transactionsByChannel).map(([channel, transactions]) => {
                    const channelTotal = transactions.reduce((sum, t) => sum + (t.net_amount || 0), 0);
                    const channelGross = transactions.reduce((sum, t) => sum + (t.gross_amount || 0), 0);
                    const isExpanded = expandedChannels[channel];

                    return (
                      <div key={channel} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleChannel(channel)}
                          className="w-full flex justify-between items-center p-4 hover:bg-emerald-50 transition-colors bg-gradient-to-r from-emerald-50 to-white"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-emerald-600" />
                            )}
                            <div className="text-left">
                              <p className="font-semibold text-slate-900 capitalize">{channel === 'offline' ? 'Offline' : channel}</p>
                              <p className="text-xs text-slate-600">{transactions.length} transaksi</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-700">Rp {channelTotal.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-slate-600">Gross: Rp {channelGross.toLocaleString('id-ID')}</p>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-emerald-50 border-t border-emerald-200 p-4 space-y-3">
                            {transactions.map((transaction, idx) => (
                              <div key={`transaction-${channel}-${transaction.id || idx}`} className="bg-white rounded-lg p-3 border border-emerald-100">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-900">{transaction.item_names || 'Item penjualan'}</p>
                                    <p className="text-xs text-slate-600 mt-1">
                                      {new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                  </div>
                                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                    {transaction.payment_status || 'pending'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2 pt-2 border-t border-slate-100">
                                  <div>
                                    <span className="text-slate-500">Jumlah Item</span>
                                    <p className="font-semibold text-slate-900">{transaction.item_count || 0}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Metode</span>
                                    <p className="font-semibold text-slate-900">{transaction.payment_method || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Gross Amount</span>
                                    <p className="font-semibold text-slate-900">Rp {(transaction.gross_amount || 0).toLocaleString('id-ID')}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Fee ({transaction.fee_percentage.toFixed(1)}%)</span>
                                    <p className="font-semibold text-red-600">-Rp {(transaction.fee_amount || 0).toLocaleString('id-ID')}</p>
                                  </div>
                                  <div className="md:col-span-4">
                                    <span className="text-slate-500">Net Amount</span>
                                    <p className="font-semibold text-blue-700">Rp {(transaction.net_amount || 0).toLocaleString('id-ID')}</p>
                                  </div>
                                  {transaction.notes && (
                                    <div className="md:col-span-4">
                                      <span className="text-slate-500">Catatan</span>
                                      <p className="font-medium text-slate-700 italic">{transaction.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
            {Object.entries(expensesByCategory).map(([category, expenses]) => {
              const categoryTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
              const isExpanded = expandedExpenseCategories[category];

              return (
                <div key={category}>
                  {/* Category Header - Clickable */}
                  <button
                    onClick={() => toggleExpenseCategory(category)}
                    className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-slate-600 font-medium">{getCategoryLabel(category)}</span>
                    </div>
                    <span className="font-semibold text-orange-600">-Rp {categoryTotal.toLocaleString('id-ID')}</span>
                  </button>

                  {/* Expanded Detail Items */}
                  {isExpanded && (
                    <div className="ml-6 mt-2 pl-4 border-l-2 border-orange-200 space-y-2 pb-2">
                      {expenses.map((expense, idx) => (
                        <div key={`expense-${category}-${expense.id || idx}`} className="bg-orange-50 rounded-lg p-3 text-sm">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{expense.description || 'Pengeluaran'}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                <Calendar className="w-3 h-3" />
                                {new Date(expense.date).toLocaleDateString('id-ID')}
                              </div>
                            </div>
                            <span className="text-orange-700 font-bold whitespace-nowrap">-Rp {(expense.amount || 0).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                            <div>
                              <span className="text-slate-500">Status:</span>
                              <p className="font-medium text-slate-700">{expense.payment_status || '-'}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Metode:</span>
                              <p className="font-medium text-slate-700">{expense.payment_method || '-'}</p>
                            </div>
                            {expense.funding_source && (
                              <div className="col-span-2">
                                <span className="text-slate-500">Sumber:</span>
                                <p className="font-medium text-slate-700">{expense.funding_source}</p>
                              </div>
                            )}
                            {expense.notes && (
                              <div className="col-span-2">
                                <span className="text-slate-500">Catatan:</span>
                                <p className="font-medium text-slate-700 italic">{expense.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

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

      {/* Rincian Penjualan - restore table view */}
      {report.transaction_details && report.transaction_details.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              Rincian Penjualan
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">Tabel transaksi: tanggal, channel, gross, fee, net, dan persentase fee</p>
          </CardHeader>
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
                  {report.transaction_details.map((item, idx) => (
                    <tr key={`detail-${item.channel}-${item.created_at}-${item.id || idx}`} className="hover:bg-slate-50 transition">
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
        </Card>
      )}
    </div>
  );
}