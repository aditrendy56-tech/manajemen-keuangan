export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { DashboardMetrics } from '@/types';

function normalizeChannel(sale: any) {
  if (sale.channel_type === 'offline') return 'offline';
  if (sale.platform === 'shopeefood' || sale.channel === 'shopeefood') return 'shopeefood';
  if (sale.platform === 'gofood' || sale.channel === 'gofood') return 'gofood';
  return sale.channel || 'offline';
}

function getRecognizedSaleAmount(sale: any) {
  const netAmount = Number(sale.net_amount || 0);
  const refundAmount = Number(sale.refund_amount || 0);
  return Math.max(netAmount - refundAmount, 0);
}

function getRecognizedExpenseAmount(expense: any) {
  const amount = Number(expense.amount || 0);
  const refundAmount = Number(expense.refund_amount || 0);
  return Math.max(amount - refundAmount, 0);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const weekStart = new Date(`${date}T00:00:00`);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    const supabase = getSupabaseServer();

    // Get today's sales (recognized by transaction date)
    const { data: sales } = await supabase.from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    // Get today's expenses (recognized by transaction date)
    const { data: expenses } = await supabase.from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('date', date);

    // Today's cash transactions for settlement basis
    const { data: cashTransactions } = await supabase.from('cash_transactions')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('transaction_date', date);

    // Get weekly sales and expenses for profit chart
    const { data: weeklySales } = await supabase.from('sales')
      .select('id, created_at, gross_amount, net_amount, platform_fee')
      .eq('outlet_id', outletId)
      .gte('created_at', `${weekStartDate}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    const { data: weeklyExpenses } = await supabase.from('expenses')
      .select('date, amount')
      .eq('outlet_id', outletId)
      .gte('date', weekStartDate)
      .lte('date', date);

    // Calculate metrics - PROPER ACCOUNTING
    const gross_revenue = (sales || []).reduce((sum: number, s: any) => sum + getRecognizedSaleAmount({ ...s, net_amount: s.gross_amount || 0 }), 0) || 0;
    const net_revenue = (sales || []).reduce((sum: number, s: any) => sum + getRecognizedSaleAmount(s), 0) || 0;
    
    // PROPER ACCOUNTING: Separate inventory from operational expenses
    const inventory_purchases = (expenses || []).filter(e => {
      const cat = (e.category || '').toLowerCase();
      return cat === 'bahan' || cat === 'peralatan' || cat === 'gabungan';
    }).reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;
    
    const operational_expenses = (expenses || []).filter(e => {
      const cat = (e.category || '').toLowerCase();
      return cat === 'operasional' || cat === 'lain_lain';
    }).reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;
    
    const total_expenses = inventory_purchases + operational_expenses;
    const platform_fees = (sales || []).reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) || 0;
    
    // Profit = Net Revenue - Operational Expenses only (inventory is asset, not expense until sold)
    // NOTE: Inventory purchases reduce cash but increase assets (not recognized as expense immediately)
    const profit = net_revenue - operational_expenses;

    const today_cash_inflow = cashTransactions?.reduce(
      (sum: number, tx: any) => sum + (tx.transaction_type === 'inflow' ? (tx.amount || 0) : 0),
      0
    ) || 0;
    const today_cash_outflow = cashTransactions?.reduce(
      (sum: number, tx: any) => sum + (tx.transaction_type === 'outflow' ? (tx.amount || 0) : 0),
      0
    ) || 0;
    const today_pending_sales = (sales || []).reduce(
      (sum: number, sale: any) => sum + (String(sale.payment_status || '').toLowerCase() === 'settled' ? 0 : getRecognizedSaleAmount(sale)),
      0
    ) || 0;
    const today_pending_expenses = (expenses || []).reduce(
      (sum: number, expense: any) => sum + (String(expense.payment_status || '').toLowerCase() === 'paid' ? 0 : getRecognizedExpenseAmount(expense)),
      0
    ) || 0;

    // Revenue by channel
    const revenue_by_channel = {
      offline: 0,
      shopeefood: 0,
      gofood: 0,
    };

    (sales || []).forEach((sale: any) => {
      const channel = normalizeChannel(sale);
      if (revenue_by_channel.hasOwnProperty(channel)) {
        revenue_by_channel[channel as keyof typeof revenue_by_channel] += getRecognizedSaleAmount(sale);
      }
    });

    // Payment methods
    const payment_methods = {
      cash: 0,
      qris: 0,
    };

    (sales || []).forEach((sale: any) => {
      if (payment_methods.hasOwnProperty(sale.payment_method)) {
        payment_methods[sale.payment_method as keyof typeof payment_methods] += getRecognizedSaleAmount(sale);
      }
    });

    // PHASE 2: Expense breakdown by category (3 only: bahan, operasional, peralatan)
    const expense_by_category = {
      bahan: 0,
      operasional: 0,
      peralatan: 0,
    };

    (expenses || []).forEach((expense: any) => {
      const cat = (expense.category || '').toLowerCase();
      if (expense_by_category.hasOwnProperty(cat)) {
        expense_by_category[cat as keyof typeof expense_by_category] += getRecognizedExpenseAmount(expense);
      }
    });

    // Cash inflow breakdown by channel (from sales only, not capital)
    const cash_inflow_by_channel = {
      offline: 0,
      shopeefood: 0,
      gofood: 0,
    };

    (sales || []).forEach((sale: any) => {
      const channel = normalizeChannel(sale);
      if (cash_inflow_by_channel.hasOwnProperty(channel)) {
        cash_inflow_by_channel[channel as keyof typeof cash_inflow_by_channel] += getRecognizedSaleAmount(sale);
      }
    });

    const topProducts = [] as DashboardMetrics['top_products'];
    const saleIds = (sales || []).map((sale: any) => sale.id) || [];
    if (saleIds.length > 0) {
      const { data: saleItems } = await getSupabaseServer().from('sale_items')
        .select('sale_id, product_id, quantity, subtotal, products(name)')
        .in('sale_id', saleIds);

      const productCounts: Record<string, { product_id: string; name: string; quantity: number; revenue: number }> = {};
      saleItems?.forEach((item: any) => {
        const productId = item.product_id || 'unknown';
        const productName = item.products?.name || 'Unknown';
        if (!productCounts[productId]) {
          productCounts[productId] = {
            product_id: productId,
            name: productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productCounts[productId].quantity += item.quantity || 0;
        productCounts[productId].revenue += item.subtotal || 0;
      });

      topProducts.push(
        ...Object.values(productCounts)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
      );
    }

    const dailyTotals = new Map<string, { revenue: number; expense: number }>();
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(`${weekStartDate}T00:00:00`);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      dailyTotals.set(dayKey, { revenue: 0, expense: 0 });
    }

    (weeklySales || []).forEach((sale: any) => {
      const dayKey = new Date(sale.created_at).toISOString().split('T')[0];
      const current = dailyTotals.get(dayKey);
      if (current) {
        current.revenue += getRecognizedSaleAmount(sale);
      }
    });

    (weeklyExpenses || []).forEach((expense: any) => {
      const current = dailyTotals.get(expense.date);
      if (current) {
        current.expense += getRecognizedExpenseAmount(expense);
      }
    });

    const weekly_profit = Array.from(dailyTotals.entries()).map(([day, totals]) => ({
      date: day,
      profit: totals.revenue - totals.expense,
    }));

    // NEW: Separate cash sources (Modal vs Sales)
    const { data: capitalEntries } = await getSupabaseServer().from('capital_entries')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('date', date);

    const cash_from_modal = (capitalEntries || []).reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0) || 0;
    const cash_from_sales = net_revenue; // Sales revenue = cash from sales

    // NEW: Separate expense sources (Kas vs Modal)
    const expense_from_kas = (expenses || [])
      .filter(e => (e.funding_source || 'kas') === 'kas')
      .reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    const expense_from_modal = (expenses || [])
      .filter(e => (e.funding_source || 'kas') === 'modal')
      .reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    // NEW: Available for distribution = Operating cash - Modal needs
    // Operating cash = Sales - Operating expenses (only)
    const operating_cash = net_revenue - operational_expenses;
    const available_for_distribution = operating_cash - expense_from_modal;

    const metrics: DashboardMetrics = {
      today_gross_revenue: gross_revenue,
      today_net_revenue: net_revenue,
      today_profit: profit,
      today_inventory_purchases: inventory_purchases,
      today_operational_expenses: operational_expenses,
      cash_from_modal,
      cash_from_sales,
      expense_from_kas,
      expense_from_modal,
      available_for_distribution,
      revenue_by_channel,
      payment_methods,
      cash_inflow_by_channel,
      expense_by_category,
      top_products: topProducts,
      weekly_profit,
      today_cash_inflow,
      today_cash_outflow,
      today_pending_sales,
      today_pending_expenses,
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
