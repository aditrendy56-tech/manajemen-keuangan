export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const outletName = searchParams.get('outlet_name') || 'Outlet';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!outletId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'outlet_id, start_date, and end_date required' },
        { status: 400 }
      );
    }

    // Get sales data
    const { data: sales } = await getSupabaseServer().from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    // Get expenses data
    const { data: expenses } = await getSupabaseServer().from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Calculate summary
    const gross_revenue = sales?.reduce((sum: number, s: any) => sum + (s.gross_amount || 0), 0) || 0;
    const net_revenue = sales?.reduce((sum: number, s: any) => sum + (s.net_amount || 0), 0) || 0;
    const platform_fees = sales?.reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) || 0;
    const total_expenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const gross_profit = net_revenue - total_expenses;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Laporan Keuangan'],
      [`Outlet: ${outletName}`],
      [`Periode: ${startDate} s/d ${endDate}`],
      [],
      ['Pendapatan Kotor', gross_revenue],
      ['Biaya Platform', platform_fees],
      ['Pendapatan Bersih', net_revenue],
      [],
      ['Total Pengeluaran', total_expenses],
      [],
      ['Laba Kotor', gross_profit],
      ['Marjin Keuntungan (%)', gross_revenue > 0 ? ((gross_profit / gross_revenue) * 100).toFixed(2) : 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

    // Sales sheet
    if (sales && sales.length > 0) {
      const salesSheet = XLSX.utils.json_to_sheet(sales);
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Detail Penjualan');
    }

    // Expenses sheet
    if (expenses && expenses.length > 0) {
      const expensesSheet = XLSX.utils.json_to_sheet(expenses);
      XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Detail Pengeluaran');
    }

    // Convert to buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const fileName = `laporan_${outletName}_${startDate}_${endDate}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
