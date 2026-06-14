'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfitLossReport } from '@/types';

interface ReportsTableProps {
  report: ProfitLossReport;
}

export function ReportsTable({ report }: ReportsTableProps) {
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Pendapatan Kotor</span>
              <span className="font-semibold">Rp {report.gross_revenue.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Biaya Platform</span>
              <span className="font-semibold text-red-600">-Rp {report.platform_fees.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b bg-white px-2 rounded dark:bg-slate-700">
              <span>Pendapatan Bersih</span>
              <span className="font-bold text-lg">Rp {report.net_revenue.toLocaleString('id-ID')}</span>
            </div>

            <div className="my-4 pt-4 border-t-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Total Pengeluaran</span>
                <span className="font-semibold text-red-600">-Rp {report.total_expenses.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="my-4 pt-4 border-t-2">
              <div className="flex justify-between items-center py-2 border-b bg-white px-2 rounded dark:bg-slate-700">
                <span className="font-semibold">Laba Kotor</span>
                <span className="font-bold text-lg text-green-700">Rp {report.gross_profit.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-white px-2 rounded mt-2 dark:bg-slate-700">
                <span>Marjin Keuntungan</span>
                <span className="font-bold text-lg text-orange-700">{report.profit_margin.toFixed(2)}%</span>
              </div>
            </div>

            {(report.settled_cash_inflow !== undefined || report.settled_cash_outflow !== undefined) && (
              <div className="my-4 pt-4 border-t-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Cash Settled Masuk</span>
                  <span className="font-semibold text-green-700">Rp {(report.settled_cash_inflow || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Cash Settled Keluar</span>
                  <span className="font-semibold text-red-700">-Rp {(report.settled_cash_outflow || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-white px-2 rounded mt-2 dark:bg-slate-700">
                  <span className="font-semibold">Cash Basis Profit</span>
                  <span className="font-bold text-lg">Rp {(report.cash_basis_profit || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            {report.online_fee_analysis && report.online_fee_analysis.online_sales_count > 0 && (
              <div className="my-4 pt-4 border-t-2">
                <div className="mb-2 text-sm font-semibold text-slate-700">Analisis Fee Online</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-950">
                    <div>Total calculated total</div>
                    <div className="text-lg font-semibold">Rp {report.online_fee_analysis.total_calculated_total.toLocaleString('id-ID')}</div>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-950">
                    <div>Total fee amount</div>
                    <div className="text-lg font-semibold">Rp {report.online_fee_analysis.total_fee_amount.toLocaleString('id-ID')}</div>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-950">
                    <div>Total fee percentage</div>
                    <div className="text-lg font-semibold">{report.online_fee_analysis.total_fee_percentage.toFixed(2)}%</div>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-950">
                    <div>Total net revenue</div>
                    <div className="text-lg font-semibold">Rp {report.online_fee_analysis.total_net_revenue.toLocaleString('id-ID')}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {Object.entries(report.online_fee_analysis.by_channel).map(([channel, data]) => (
                    data.sales_count > 0 ? (
                      <div key={channel} className="flex items-center justify-between rounded border bg-white px-3 py-2">
                        <span className="capitalize">{channel}</span>
                        <span>Rp {data.net_revenue.toLocaleString('id-ID')} · {data.fee_amount.toLocaleString('id-ID')} fee · {data.fee_percentage.toFixed(2)}%</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {report.transaction_details && report.transaction_details.length > 0 && (
              <div className="my-4 pt-4 border-t-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Detail Transaksi</div>
                    <p className="text-xs text-slate-500">Klik untuk melihat gross, fee, dan net per transaksi.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransactionDetails((prev) => !prev)}
                  >
                    {showTransactionDetails ? 'Sembunyikan' : 'Lihat detail'}
                  </Button>
                </div>

                {showTransactionDetails && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Tanggal</th>
                            <th className="px-3 py-2 text-left">Channel</th>
                            <th className="px-3 py-2 text-right">Gross</th>
                            <th className="px-3 py-2 text-right">Fee</th>
                            <th className="px-3 py-2 text-right">Net</th>
                            <th className="px-3 py-2 text-right">% Fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.transaction_details.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100 align-top">
                              <td className="px-3 py-2 text-slate-700">{new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td className="px-3 py-2 text-slate-700 capitalize">{item.channel}</td>
                              <td className="px-3 py-2 text-right">Rp {item.gross_amount.toLocaleString('id-ID')}</td>
                              <td className="px-3 py-2 text-right text-red-600">Rp {item.fee_amount.toLocaleString('id-ID')}</td>
                              <td className="px-3 py-2 text-right font-semibold">Rp {item.net_amount.toLocaleString('id-ID')}</td>
                              <td className="px-3 py-2 text-right text-amber-700">{item.fee_percentage.toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(report.pending_sales_amount !== undefined || report.pending_expenses_amount !== undefined) && (
              <div className="my-4 pt-4 border-t-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Pending Sales</span>
                  <span className="font-semibold text-amber-700">Rp {(report.pending_sales_amount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Pending Expenses</span>
                  <span className="font-semibold text-amber-700">Rp {(report.pending_expenses_amount || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {Object.keys(report.expenses_by_category).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(report.expenses_by_category).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center py-2 border-b">
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <span className="font-semibold">Rp {(amount as number).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}