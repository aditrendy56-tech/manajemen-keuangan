export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

type SaleRecord = {
  id?: string;
  created_at?: string | null;
  gross_amount?: number | string | null;
  calculated_total?: number | string | null;
  fee_amount?: number | string | null;
  platform_fee?: number | string | null;
  net_amount?: number | string | null;
  payment_status?: string | null;
  refund_amount?: number | string | null;
  channel_type?: string | null;
  platform?: string | null;
  channel?: string | null;
  notes?: string | null;
  payment_method?: string | null;
};

type ExpenseRecord = {
  id?: string;
  amount?: number | string | null;
  refund_amount?: number | string | null;
  category?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  funding_source?: string | null;
  description?: string | null;
  notes?: string | null;
  date?: string | null;
};

type SaleItemRecord = {
  sale_id?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  subtotal?: number | string | null;
  cost_price?: number | string | null;
  products?: { name?: string | null } | null;
};

function toNumber(value: number | string | null | undefined): number {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(numericValue) ? Number(numericValue) : 0;
}

function getRecognizedSaleAmount(sale: SaleRecord) {
  const netAmount = toNumber(sale.net_amount);
  const refundAmount = toNumber(sale.refund_amount);
  return Math.max(netAmount - refundAmount, 0);
}

function getRecognizedExpenseAmount(expense: ExpenseRecord) {
  const amount = toNumber(expense.amount);
  const refundAmount = toNumber(expense.refund_amount);
  return Math.max(amount - refundAmount, 0);
}

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

    const { data: sales } = await getSupabaseServer().from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    const { data: expenses } = await getSupabaseServer().from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('date', startDate)
      .lte('date', endDate);

    const saleIds = (sales || []).map((sale: SaleRecord) => sale.id).filter((id): id is string => Boolean(id));
    const { data: saleItems } = await getSupabaseServer().from('sale_items')
      .select('sale_id, quantity, unit_price, subtotal, cost_price, products(name)')
      .in('sale_id', saleIds);

    const gross_revenue = (sales || []).reduce((sum: number, sale: SaleRecord) => sum + toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount), 0) || 0;
    const platform_fees = (sales || []).reduce((sum: number, sale: SaleRecord) => sum + toNumber(sale.platform_fee || sale.fee_amount), 0) || 0;
    const total_hpp = (saleItems || []).reduce((sum: number, item: SaleItemRecord) => sum + ((toNumber(item.cost_price) || 0) * (toNumber(item.quantity) || 1)), 0) || 0;
    const net_revenue = gross_revenue - total_hpp;
    const total_expenses = (expenses || []).reduce((sum: number, expense: ExpenseRecord) => sum + getRecognizedExpenseAmount(expense), 0) || 0;
    const operational_expenses = (expenses || []).filter((expense: ExpenseRecord) => String(expense.category || '').toLowerCase() === 'operasional').reduce((sum: number, expense: ExpenseRecord) => sum + getRecognizedExpenseAmount(expense), 0) || 0;
    // ✅ FIXED: Profit should ONLY deduct operational expenses, not materials/equipment
    const gross_profit = net_revenue - operational_expenses;
    const net_profit = net_revenue - operational_expenses;

    const dailyBreakdownMap = new Map<string, {
      gross_revenue: number;
      platform_fees: number;
      net_revenue: number;
      hpp: number;
      operational_expenses: number;
      profit: number;
      item_count: number;
    }>();

    (sales || []).forEach((sale: SaleRecord) => {
      const saleDate = String(sale.created_at || '').split('T')[0];
      const existing = dailyBreakdownMap.get(saleDate) || {
        gross_revenue: 0,
        platform_fees: 0,
        net_revenue: 0,
        hpp: 0,
        operational_expenses: 0,
        profit: 0,
        item_count: 0,
      };

      const grossAmount = toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount);
      const netAmount = getRecognizedSaleAmount(sale);
      const feeAmount = toNumber(sale.platform_fee || sale.fee_amount || Math.max(grossAmount - netAmount, 0));

      existing.gross_revenue += grossAmount;
      existing.platform_fees += feeAmount;
      existing.net_revenue += netAmount;
      dailyBreakdownMap.set(saleDate, existing);
    });

    const saleItemMap = new Map<string, Array<{ quantity: number; cost_price: number }>>();
    (saleItems || []).forEach((item: SaleItemRecord) => {
      const current = saleItemMap.get(String(item.sale_id || '')) || [];
      current.push({ quantity: toNumber(item.quantity), cost_price: toNumber(item.cost_price) });
      saleItemMap.set(String(item.sale_id || ''), current);
    });

    (sales || []).forEach((sale: SaleRecord) => {
      const saleDate = String(sale.created_at || '').split('T')[0];
      const current = dailyBreakdownMap.get(saleDate);
      if (!current) return;

      const items = saleItemMap.get(String(sale.id || '')) || [];
      const hpp = items.reduce((sum: number, item: { quantity: number; cost_price: number }) => sum + ((item.cost_price || 0) * (item.quantity || 1)), 0);
      const itemCount = items.reduce((sum: number, item: { quantity: number }) => sum + (item.quantity || 0), 0);

      current.hpp += hpp;
      current.item_count += itemCount;
    });

    (expenses || []).forEach((expense: ExpenseRecord) => {
      const expenseDate = String(expense.date || '').split('T')[0];
      const current = dailyBreakdownMap.get(expenseDate);
      if (!current) return;

      const amount = getRecognizedExpenseAmount(expense);
      if (String(expense.category || '').toLowerCase() === 'operasional') {
        current.operational_expenses += amount;
      }
    });

    dailyBreakdownMap.forEach((values) => {
      values.profit = values.net_revenue - values.operational_expenses;
    });

    const dailyBreakdown = Array.from(dailyBreakdownMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        gross_revenue: values.gross_revenue,
        platform_fees: values.platform_fees,
        net_revenue: values.net_revenue,
        hpp: values.hpp,
        operational_expenses: values.operational_expenses,
        profit: values.profit,
        item_count: values.item_count,
      }));

    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ['Laporan Keuangan'],
      [`Outlet: ${outletName}`],
      [`Periode: ${startDate} s/d ${endDate}`],
      [],
      ['Pendapatan Kotor', gross_revenue],
      ['Biaya Platform', platform_fees],
      ['Pendapatan Bersih', net_revenue],
      ['Total HPP', total_hpp],
      ['Total Pengeluaran', total_expenses],
      ['Biaya Operasional', operational_expenses],
      ['Laba Kotor', gross_profit],
      ['Laba Bersih', net_profit],
      ['Marjin Keuntungan (%)', gross_revenue > 0 ? ((gross_profit / gross_revenue) * 100).toFixed(2) : 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

    if (sales && sales.length > 0) {
      const salesDetail = (sales || []).map((sale: SaleRecord) => {
        const grossAmount = toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount);
        const feeAmount = toNumber(sale.fee_amount ?? (grossAmount - toNumber(sale.net_amount)));
        const netAmount = toNumber(sale.net_amount ?? (grossAmount - feeAmount));
        const items = (saleItems || []).filter((item: SaleItemRecord) => item.sale_id === sale.id);
        const itemNames = items.map((item: SaleItemRecord) => item.products?.name || 'Item').join(', ');
        return {
          id: sale.id,
          tanggal: sale.created_at,
          channel: sale.channel || sale.platform || 'offline',
          platform: sale.platform || '-',
          payment_method: sale.payment_method || '-',
          payment_status: sale.payment_status || '-',
          item_names: itemNames || '-',
          item_count: items.reduce((sum, item) => sum + toNumber(item.quantity), 0),
          gross_amount: grossAmount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          notes: sale.notes || '-',
        };
      });
      const salesSheet = XLSX.utils.json_to_sheet(salesDetail);
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Detail Penjualan');
    }

    if (expenses && expenses.length > 0) {
      const expensesDetail = (expenses || []).map((expense: ExpenseRecord) => ({
        id: expense.id,
        tanggal: expense.date,
        kategori: expense.category || '-',
        deskripsi: expense.description || '-',
        jumlah: getRecognizedExpenseAmount(expense),
        payment_method: expense.payment_method || '-',
        payment_status: expense.payment_status || '-',
        funding_source: expense.funding_source || '-',
        notes: expense.notes || '-',
      }));
      const expensesSheet = XLSX.utils.json_to_sheet(expensesDetail);
      XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Detail Pengeluaran');
    }

    if (dailyBreakdown.length > 0) {
      const breakdownSheet = XLSX.utils.json_to_sheet(dailyBreakdown);
      XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Daily Breakdown');
    }

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const fileName = `laporan_${outletName}_${startDate}_${endDate}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
