'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfitLossReport } from '@/types';

interface ReportsTableProps {
  report: ProfitLossReport;
}

export function ReportsTable({ report }: ReportsTableProps) {
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