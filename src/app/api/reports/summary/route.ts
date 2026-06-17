export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ProfitLossReport } from '@/types';

type SaleRecord = {
  id?: string;
  outlet_id?: string | null;
  created_at?: string | null;
  channel_type?: string | null;
  platform?: string | null;
  channel?: string | null;
  gross_amount?: number | string | null;
  calculated_total?: number | string | null;
  fee_amount?: number | string | null;
  platform_fee?: number | string | null;
  net_amount?: number | string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  refund_amount?: number | string | null;
  notes?: string | null;
};

type ExpenseRecord = {
  id?: string;
  amount?: number | string | null;
  refund_amount?: number | string | null;
  category?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  funding_source?: string | null;
  date?: string | null;
  description?: string | null;
  notes?: string | null;
};

type CashTransactionRecord = {
  transaction_type?: string | null;
  amount?: number | string | null;
};

type SaleItemRecord = {
  sale_id?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  subtotal?: number | string | null;
  cost_price?: number | string | null;
  products?: {
    name?: string | null;
  } | null;
};

function toNumber(value: number | string | null | undefined): number {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(numericValue) ? Number(numericValue) : 0;
}

function normalizeChannel(sale: SaleRecord) {
  if (sale.channel_type === 'offline') return 'offline';
  if (sale.platform === 'shopeefood' || sale.channel === 'shopeefood') return 'shopeefood';
  if (sale.platform === 'gofood' || sale.channel === 'gofood') return 'gofood';
  return sale.channel || 'offline';
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!outletId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'outlet_id, start_date, and end_date required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data: sales } = await supabase.from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    const { data: expenses } = await supabase.from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: cashTransactions } = await supabase.from('cash_transactions')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    const gross_revenue = (sales || []).reduce((sum: number, sale: SaleRecord) => sum + toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount), 0) || 0;
    const platform_fees = (sales || []).reduce((sum: number, sale: SaleRecord) => sum + toNumber(sale.platform_fee || sale.fee_amount), 0) || 0;

    const saleIds = (sales || []).map((sale: SaleRecord) => sale.id).filter((id): id is string => Boolean(id));

    const saleItemRows = saleIds.length > 0
      ? await supabase.from('sale_items')
          .select('sale_id, quantity, unit_price, subtotal, cost_price, products(name)')
          .in('sale_id', saleIds)
      : { data: [] as SaleItemRecord[] };

    // Calculate total HPP (Cost of Goods Sold)
    const total_hpp = (saleItemRows.data || []).reduce(
      (sum: number, item: SaleItemRecord) => sum + ((item.cost_price || 0) * (item.quantity || 1)),
      0
    ) || 0;

    // Net Revenue = Gross Revenue - HPP (Cost of Goods Sold)
    const net_revenue = gross_revenue - total_hpp;

    const saleItemMap = new Map<string, Array<{ quantity: number; unit_price: number; subtotal: number; cost_price: number; product_name: string }>>();
    (saleItemRows.data || []).forEach((item: SaleItemRecord) => {
      const current = saleItemMap.get(String(item.sale_id || '')) || [];
      current.push({
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        subtotal: toNumber(item.subtotal),
        cost_price: toNumber(item.cost_price),
        product_name: item.products?.name || 'Item',
      });
      saleItemMap.set(String(item.sale_id || ''), current);
    });

    const onlineSales = (sales || []).filter((sale: SaleRecord) => sale.channel_type === 'online' || sale.platform === 'shopeefood' || sale.platform === 'gofood');
    const totalCalculatedTotal = onlineSales.reduce((sum: number, sale: SaleRecord) => sum + toNumber(sale.calculated_total ?? sale.gross_amount), 0) || 0;
    const totalFeeAmount = onlineSales.reduce((sum: number, sale: SaleRecord) => {
      const calculatedTotal = toNumber(sale.calculated_total ?? sale.gross_amount);
      const feeAmount = toNumber(sale.fee_amount ?? (calculatedTotal - toNumber(sale.net_amount)));
      return sum + feeAmount;
    }, 0) || 0;
    const totalFeePercentage = totalCalculatedTotal > 0 ? (totalFeeAmount / totalCalculatedTotal) * 100 : 0;
    const totalNetRevenue = onlineSales.reduce((sum: number, sale: SaleRecord) => sum + toNumber(sale.net_amount), 0) || 0;

    const transaction_details = (sales || []).map((sale: SaleRecord) => {
      const calculatedTotal = toNumber(sale.calculated_total ?? sale.gross_amount);
      const feeAmount = toNumber(sale.fee_amount ?? (calculatedTotal - toNumber(sale.net_amount)));
      const feePercentage = calculatedTotal > 0 ? (feeAmount / calculatedTotal) * 100 : 0;
      const grossAmount = toNumber(sale.gross_amount ?? calculatedTotal);
      const netAmount = toNumber(sale.net_amount ?? (grossAmount - feeAmount));
      const items = saleItemMap.get(String(sale.id || '')) || [];
      const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const itemNames = items.map((item) => item.product_name).join(', ');

      return {
        id: sale.id,
        created_at: sale.created_at,
        channel: normalizeChannel(sale),
        platform: sale.platform || null,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        fee_percentage: feePercentage,
        platform_fee: toNumber(sale.platform_fee),
        net_amount: netAmount,
        payment_method: sale.payment_method || null,
        payment_status: sale.payment_status || null,
        item_count: itemCount,
        item_names: itemNames || null,
        notes: sale.notes || null,
      };
    });

    const byChannel = {
      shopeefood: { calculated_total: 0, fee_amount: 0, fee_percentage: 0, net_revenue: 0, sales_count: 0 },
      gofood: { calculated_total: 0, fee_amount: 0, fee_percentage: 0, net_revenue: 0, sales_count: 0 },
    };

    onlineSales.forEach((sale: SaleRecord) => {
      const channel = sale.platform === 'shopeefood' || sale.channel === 'shopeefood' ? 'shopeefood' : 'gofood';
      if (!byChannel[channel]) return;

      const calculatedTotal = toNumber(sale.calculated_total ?? sale.gross_amount);
      const feeAmount = toNumber(sale.fee_amount ?? (calculatedTotal - toNumber(sale.net_amount)));
      const feePercentage = calculatedTotal > 0 ? (feeAmount / calculatedTotal) * 100 : 0;

      byChannel[channel].calculated_total += calculatedTotal;
      byChannel[channel].fee_amount += feeAmount;
      byChannel[channel].fee_percentage += feePercentage;
      byChannel[channel].net_revenue += toNumber(sale.net_amount);
      byChannel[channel].sales_count += 1;
    });

    Object.values(byChannel).forEach((channelData) => {
      channelData.fee_percentage = channelData.calculated_total > 0
        ? (channelData.fee_amount / channelData.calculated_total) * 100
        : 0;
    });

    const settled_cash_inflow = cashTransactions?.reduce(
      (sum: number, tx: CashTransactionRecord) => sum + (tx.transaction_type === 'inflow' ? toNumber(tx.amount) : 0),
      0
    ) || 0;
    const settled_cash_outflow = cashTransactions?.reduce(
      (sum: number, tx: CashTransactionRecord) => sum + (tx.transaction_type === 'outflow' ? toNumber(tx.amount) : 0),
      0
    ) || 0;

    const expenses_by_category: Record<string, number> = {};
    let total_expenses = 0;

    (expenses || []).forEach((expense: ExpenseRecord) => {
      const recognizedAmount = getRecognizedExpenseAmount(expense);
      const category = String(expense.category || 'operasional').toLowerCase();
      expenses_by_category[category] = (expenses_by_category[category] || 0) + recognizedAmount;
      total_expenses += recognizedAmount;
    });

    const pending_sales_amount = (sales || []).reduce(
      (sum: number, sale: SaleRecord) => sum + (String(sale.payment_status || '').toLowerCase() === 'settled' ? 0 : getRecognizedSaleAmount(sale)),
      0
    ) || 0;

    const pending_expenses_amount = (expenses || []).reduce(
      (sum: number, expense: ExpenseRecord) => sum + (String(expense.payment_status || '').toLowerCase() === 'paid' ? 0 : getRecognizedExpenseAmount(expense)),
      0
    ) || 0;

    const operational_expenses = (expenses || []).filter((expense: ExpenseRecord) => String(expense.category || '').toLowerCase() === 'operasional')
      .reduce((sum: number, expense: ExpenseRecord) => sum + getRecognizedExpenseAmount(expense), 0) || 0;
    // ✅ FIXED: Profit should ONLY deduct operational expenses, not materials/equipment
    const gross_profit = net_revenue - operational_expenses;
    const net_profit = net_revenue - operational_expenses;
    const profit_margin = gross_revenue > 0 ? (gross_profit / gross_revenue) * 100 : 0;

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
      const feeAmount = toNumber(sale.platform_fee || sale.fee_amount || 0);

      existing.gross_revenue += grossAmount;
      existing.platform_fees += feeAmount;
      dailyBreakdownMap.set(saleDate, existing);
    });

    const hppItemMap = new Map<string, Array<{ quantity: number; cost_price: number }>>();
    (saleItemRows.data || []).forEach((row: SaleItemRecord) => {
      const current = hppItemMap.get(String(row.sale_id || '')) || [];
      current.push({ quantity: toNumber(row.quantity), cost_price: toNumber(row.cost_price) });
      hppItemMap.set(String(row.sale_id || ''), current);
    });

    (sales || []).forEach((sale: SaleRecord) => {
      const saleDate = String(sale.created_at || '').split('T')[0];
      const current = dailyBreakdownMap.get(saleDate);
      if (!current) return;

      const items = hppItemMap.get(String(sale.id || '')) || [];
      const hpp = items.reduce((sum: number, item: { quantity: number; cost_price: number }) => sum + ((item.cost_price || 0) * (item.quantity || 1)), 0);
      const itemCount = items.reduce((sum: number, item: { quantity: number }) => sum + (item.quantity || 0), 0);

      current.hpp += hpp;
      current.item_count += itemCount;
      // Update net_revenue to be gross_revenue - hpp
      current.net_revenue = current.gross_revenue - current.hpp;
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

    const daily_breakdown = Array.from(dailyBreakdownMap.entries())
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

    const expense_details = (expenses || []).map((expense: ExpenseRecord) => ({
      id: expense.id,
      date: expense.date || '',
      category: String(expense.category || 'operasional').toLowerCase(),
      description: expense.description || null,
      amount: getRecognizedExpenseAmount(expense),
      refund_amount: toNumber(expense.refund_amount),
      payment_status: expense.payment_status || null,
      payment_method: expense.payment_method || null,
      funding_source: expense.funding_source || null,
      notes: expense.notes || null,
    }));

    const report: ProfitLossReport = {
      gross_revenue,
      platform_fees,
      net_revenue,
      total_expenses,
      expenses_by_category,
      gross_profit,
      operational_expenses,
      net_profit,
      profit_margin,
      recognized_gross_revenue: gross_revenue,
      recognized_net_revenue: net_revenue,
      settled_cash_inflow,
      settled_cash_outflow,
      pending_sales_amount,
      pending_expenses_amount,
      cash_basis_profit: settled_cash_inflow - settled_cash_outflow,
      daily_breakdown,
      transaction_details,
      expense_details,
      total_sales_count: sales?.length || 0,
      total_expense_count: expenses?.length || 0,
      online_fee_analysis: {
        total_calculated_total: totalCalculatedTotal,
        total_fee_amount: totalFeeAmount,
        total_fee_percentage: totalFeePercentage,
        total_net_revenue: totalNetRevenue,
        online_sales_count: onlineSales.length,
        by_channel: byChannel,
      },
    };

    const revenueByChannel = { offline: 0, shopeefood: 0, gofood: 0 };
    (sales || []).forEach((sale: SaleRecord) => {
      const channel = normalizeChannel(sale);
      const recognizedGross = toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount);
      if (channel === 'offline') revenueByChannel.offline += recognizedGross;
      else if (channel === 'shopeefood') revenueByChannel.shopeefood += recognizedGross;
      else if (channel === 'gofood') revenueByChannel.gofood += recognizedGross;
    });

    const paymentMethod = { cash: 0, qris: 0 };
    (sales || []).forEach((sale: SaleRecord) => {
      const recognizedGross = toNumber(sale.gross_amount || sale.calculated_total || sale.net_amount);
      if (sale.payment_method === 'cash') paymentMethod.cash += recognizedGross;
      else if (sale.payment_method === 'qris') paymentMethod.qris += recognizedGross;
    });

    const { data: saleItems } = await supabase.from('sale_items')
      .select('product_id, quantity, products(name)')
      .in('sale_id', saleIds);

    const productCounts: Record<string, { name: string; quantity: number }> = {};
    saleItems?.forEach((item: SaleItemRecord) => {
      const productName = item.products?.name || 'Unknown';
      if (!productCounts[productName]) {
        productCounts[productName] = { name: productName, quantity: 0 };
      }
      productCounts[productName].quantity += item.quantity || 0;
    });

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return NextResponse.json({ report, revenueByChannel, paymentMethod, topProducts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
