import { utils as XLSXUtils, writeFile } from 'xlsx';
import { ProfitLossReport } from '@/types';

export interface ExportData {
  summary: ProfitLossReport;
  sales: any[];
  expenses: any[];
  byChannel: any[];
  byProduct: any[];
}

export function generateExcelFile(data: ExportData, outlet: string, dateRange: string) {
  const workbook = XLSXUtils.book_new();

  // Summary sheet
  const summaryData = [
    ['Laporan Keuangan'],
    [`Outlet: ${outlet}`],
    [`Periode: ${dateRange}`],
    [],
    ['Pendapatan Kotor', formatCurrency(data.summary.gross_revenue)],
    ['Biaya Platform', formatCurrency(data.summary.platform_fees)],
    ['Pendapatan Bersih', formatCurrency(data.summary.net_revenue)],
    [],
    ['Total Pengeluaran', formatCurrency(data.summary.total_expenses)],
    [],
    ['Laba Kotor', formatCurrency(data.summary.gross_profit)],
    ['Marjin Keuntungan (%)', data.summary.profit_margin.toFixed(2)],
  ];
  const summarySheet = XLSXUtils.aoa_to_sheet(summaryData);
  XLSXUtils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

  // Sales Detail sheet
  if (data.sales.length > 0) {
    const salesSheet = XLSXUtils.json_to_sheet(data.sales);
    XLSXUtils.book_append_sheet(workbook, salesSheet, 'Detail Penjualan');
  }

  // Expenses Detail sheet
  if (data.expenses.length > 0) {
    const expensesSheet = XLSXUtils.json_to_sheet(data.expenses);
    XLSXUtils.book_append_sheet(workbook, expensesSheet, 'Detail Pengeluaran');
  }

  // By Channel sheet
  if (data.byChannel.length > 0) {
    const channelSheet = XLSXUtils.json_to_sheet(data.byChannel);
    XLSXUtils.book_append_sheet(workbook, channelSheet, 'Per Channel');
  }

  // By Product sheet
  if (data.byProduct.length > 0) {
    const productSheet = XLSXUtils.json_to_sheet(data.byProduct);
    XLSXUtils.book_append_sheet(workbook, productSheet, 'Per Produk');
  }

  // Write file
  const fileName = `laporan_${outlet}_${dateRange.replace(/\s/g, '_')}.xlsx`;
  writeFile(workbook, fileName);
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}
