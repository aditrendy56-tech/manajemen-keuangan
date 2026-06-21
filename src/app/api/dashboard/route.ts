export const revalidate = 15;

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

function getSaleDateValue(sale: any, sessionDateMap: Map<string, string>) {
  if (sale.session_id && sessionDateMap.has(sale.session_id)) {
    return String(sessionDateMap.get(sale.session_id));
  }

  if (sale.created_at) {
    const createdAtDate = String(sale.created_at).slice(0, 10);
    if (createdAtDate) return createdAtDate;
  }

  return '';
}

async function getSessionIdsForDateRange(supabase: any, outletId: string, startDate: string, endDate: string) {
  const { data: sessions, error } = await supabase
    .from('daily_sessions')
    .select('id')
    .eq('outlet_id', outletId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return (sessions || []).map((session: any) => session.id);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const requestedDate = searchParams.get('date');

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Resolve effective date for dashboard. Use the explicit request date when provided,
    // otherwise fall back to the current system date. This prevents past-session entries
    // from being incorrectly attributed to the current day.
    const systemDate = new Date().toISOString().split('T')[0];
    const effectiveDate = requestedDate || systemDate;

    const date = effectiveDate;
    const weekStart = new Date(`${date}T00:00:00`);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    // Get outlet settings for fee rates (support legacy column names)
    const { data: outletSettings } = await supabase.from('outlet_settings')
      .select('fee_rate_shopeefood, fee_rate_gofood, fee_shopeefood, fee_gofood')
      .eq('outlet_id', outletId)
      .maybeSingle();

    const fee_rate_shopeefood = Number(outletSettings?.fee_rate_shopeefood ?? outletSettings?.fee_shopeefood ?? 0.08);
    const fee_rate_gofood = Number(outletSettings?.fee_rate_gofood ?? outletSettings?.fee_gofood ?? 0.10);

    const { data: allSessionsForOutlet } = await supabase
      .from('daily_sessions')
      .select('id, date')
      .eq('outlet_id', outletId);

    const sessionDateMap = new Map<string, string>(
      (allSessionsForOutlet || []).map((session: any) => [session.id, String(session.date)])
    );

    const [todaySessionIds, weekSessionIds, cumulativeSessionIds] = await Promise.all([
      getSessionIdsForDateRange(supabase, outletId, date, date),
      getSessionIdsForDateRange(supabase, outletId, weekStartDate, date),
      getSessionIdsForDateRange(supabase, outletId, '1970-01-01', date),
    ]);

    const [salesTodayResult, weeklySalesResult, cumulativeSalesResult, expensesTodayResult, weeklyExpensesResult, allExpensesResult, cashTransactionsResult, allCashTransactionsResult] = await Promise.all([
      todaySessionIds.length > 0
        ? supabase
            .from('sales')
            .select('id, net_amount, gross_amount, platform_fee, payment_method, channel_type, platform, channel, payment_status, session_id, outlet_id, refund_amount, created_at, type, quantity')
            .in('session_id', todaySessionIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      weekSessionIds.length > 0
        ? supabase
            .from('sales')
            .select('id, net_amount, gross_amount, platform_fee, payment_method, channel_type, platform, channel, payment_status, session_id, outlet_id, refund_amount, created_at, type, quantity')
            .in('session_id', weekSessionIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      cumulativeSessionIds.length > 0
        ? supabase
            .from('sales')
            .select('id, net_amount, gross_amount, platform_fee, payment_method, channel_type, platform, channel, payment_status, session_id, outlet_id, refund_amount, created_at, type, quantity')
            .in('session_id', cumulativeSessionIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabase
        .from('expenses')
        .select('id, amount, category, date, payment_status, funding_source, refund_amount, description')
        .eq('outlet_id', outletId)
        .eq('date', date),
      supabase
        .from('expenses')
        .select('date, amount, category')
        .eq('outlet_id', outletId)
        .gte('date', weekStartDate)
        .lte('date', date),
      supabase
        .from('expenses')
        .select('id, amount, category, date, payment_status, funding_source, refund_amount, description')
        .eq('outlet_id', outletId)
        .lte('date', date),
      supabase
        .from('cash_transactions')
        .select('amount, transaction_type')
        .eq('outlet_id', outletId)
        .eq('transaction_date', date),
      supabase
        .from('cash_transactions')
        .select('amount, transaction_type')
        .eq('outlet_id', outletId)
        .lte('transaction_date', date),
    ]);

    const sales = (salesTodayResult.data || []) as any[];
    const weeklySales = (weeklySalesResult.data || []) as any[];
    const filteredAllSales = (cumulativeSalesResult.data || []) as any[];
    const expenses = (expensesTodayResult.data || []) as any[];
    const weeklyExpenses = (weeklyExpensesResult.data || []) as any[];
    const allExpenses = (allExpensesResult.data || []) as any[];
    const cashTransactions = (cashTransactionsResult.data || []) as any[];
    const allCashTransactions = (allCashTransactionsResult.data || []) as any[];

    // ===== TODAY (HARIAN) CALCULATION =====
    
    // STEP 1: Calculate Gross Revenue by Channel
    const today_revenue_by_channel = {
      offline: 0,
      shopeefood: 0,
      gofood: 0,
    };

    (sales || []).forEach((sale: any) => {
      const channel = normalizeChannel(sale);
      const saleAmount = getRecognizedSaleAmount(sale);
      if (today_revenue_by_channel.hasOwnProperty(channel)) {
        today_revenue_by_channel[channel as keyof typeof today_revenue_by_channel] += saleAmount;
      }
    });

    const today_gross_revenue = today_revenue_by_channel.offline + today_revenue_by_channel.shopeefood + today_revenue_by_channel.gofood;

    // STEP 2: Calculate HPP (Cost of Goods Sold) - internal only, not displayed
    const saleIds = (sales || []).map((sale: any) => sale.id) || [];
    let today_total_hpp = 0;
    let today_total_items_sold = 0;
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase.from('sale_items')
        .select('cost_price, quantity')
        .in('sale_id', saleIds);
      
      today_total_hpp = (saleItems || []).reduce((sum: number, item: any) => sum + ((item.cost_price || 0) * (item.quantity || 1)), 0) || 0;
      today_total_items_sold = (saleItems || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
    }

    // STEP 3: Calculate Platform Fees by Channel (per session/harian)
    const today_fee_shopeefood = today_revenue_by_channel.shopeefood * fee_rate_shopeefood;
    const today_fee_gofood = today_revenue_by_channel.gofood * fee_rate_gofood;
    const today_total_platform_fee = today_fee_shopeefood + today_fee_gofood; // offline: 0%

    // STEP 4: Calculate Pendapatan Bersih (Net Revenue)
    // NOTE: `today_gross_revenue` already uses `sale.net_amount` (real money received after marketplace fee).
    // Platform fees are kept for analytics only (tracked via today_total_platform_fee),
    // so do not subtract platform fee again here to avoid double-dipping.
    const today_pendapatan_bersih = today_gross_revenue - today_total_hpp;

    // STEP 5: Calculate Operational Expenses (ONLY category='operasional')
    const today_operational_expenses = (expenses || []).filter((e: any) => {
      const cat = (e.category || '').toLowerCase();
      return cat === 'operasional';
    }).reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    // FINAL: Calculate Profit
    const today_profit = today_pendapatan_bersih - today_operational_expenses;

    // Backward compat: track inventory_purchases (not deducted from profit)
    const today_inventory_purchases = (expenses || []).filter((e: any) => {
      const cat = (e.category || '').toLowerCase();
      return cat === 'bahan' || cat === 'peralatan';
    }).reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

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

    const cumulative_cash_inflow = allCashTransactions?.reduce(
      (sum: number, tx: any) => sum + (tx.transaction_type === 'inflow' ? (tx.amount || 0) : 0),
      0
    ) || 0;
    const cumulative_cash_outflow = allCashTransactions?.reduce(
      (sum: number, tx: any) => sum + (tx.transaction_type === 'outflow' ? (tx.amount || 0) : 0),
      0
    ) || 0;

    // Payment methods (today)
    const today_payment_methods = {
      cash: 0,
      qris: 0,
    };

    (sales || []).forEach((sale: any) => {
      if (today_payment_methods.hasOwnProperty(sale.payment_method)) {
        today_payment_methods[sale.payment_method as keyof typeof today_payment_methods] += getRecognizedSaleAmount(sale);
      }
    });

    // Expense by category (today)
    const today_expense_by_category = {
      bahan: 0,
      operasional: 0,
      peralatan: 0,
    };

    (expenses || []).forEach((expense: any) => {
      const cat = (expense.category || '').toLowerCase();
      if (today_expense_by_category.hasOwnProperty(cat)) {
        today_expense_by_category[cat as keyof typeof today_expense_by_category] += getRecognizedExpenseAmount(expense);
      }
    });

    // Cash inflow by channel (today)
    const today_cash_inflow_by_channel = {
      offline: 0,
      shopeefood: 0,
      gofood: 0,
    };

    (sales || []).forEach((sale: any) => {
      const channel = normalizeChannel(sale);
      if (today_cash_inflow_by_channel.hasOwnProperty(channel)) {
        today_cash_inflow_by_channel[channel as keyof typeof today_cash_inflow_by_channel] += getRecognizedSaleAmount(sale);
      }
    });

    // ===== CUMULATIVE (TOTAL) CALCULATION =====

    const cumulativeSales = (filteredAllSales || []).filter((sale: any) => {
      const saleDate = getSaleDateValue(sale, sessionDateMap);
      return !saleDate || saleDate <= date;
    });

    // STEP 1: Calculate Cumulative Gross Revenue by Channel
    const cumulative_revenue_by_channel = {
      offline: 0,
      shopeefood: 0,
      gofood: 0,
    };

    filteredAllSales.forEach((sale: any) => {
      const channel = normalizeChannel(sale);
      const saleAmount = getRecognizedSaleAmount(sale);
      if (cumulative_revenue_by_channel.hasOwnProperty(channel)) {
        cumulative_revenue_by_channel[channel as keyof typeof cumulative_revenue_by_channel] += saleAmount;
      }
    });

    const cumulative_gross_revenue = cumulative_revenue_by_channel.offline + cumulative_revenue_by_channel.shopeefood + cumulative_revenue_by_channel.gofood;

    // STEP 2: Calculate Cumulative HPP
    const allSaleIds = filteredAllSales.map((sale: any) => sale.id) || [];
    let cumulative_total_hpp = 0;
    let cumulative_total_items_sold = 0;
    if (allSaleIds.length > 0) {
      const { data: allSaleItems } = await supabase.from('sale_items')
        .select('cost_price, quantity')
        .in('sale_id', allSaleIds);
      
      cumulative_total_hpp = (allSaleItems || []).reduce((sum: number, item: any) => sum + ((item.cost_price || 0) * (item.quantity || 1)), 0) || 0;
      cumulative_total_items_sold = (allSaleItems || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
    }

    // STEP 3: Calculate Cumulative Platform Fees
    const cumulative_fee_shopeefood = cumulative_revenue_by_channel.shopeefood * fee_rate_shopeefood;
    const cumulative_fee_gofood = cumulative_revenue_by_channel.gofood * fee_rate_gofood;
    const cumulative_total_platform_fee = cumulative_fee_shopeefood + cumulative_fee_gofood;

    // STEP 4: Calculate Cumulative Pendapatan Bersih
    // `cumulative_gross_revenue` is aggregated from `sale.net_amount` (already after fee),
    // keep platform fee as analytics and do not subtract again here.
    const cumulative_pendapatan_bersih = cumulative_gross_revenue - cumulative_total_hpp;

    // STEP 5: Calculate Cumulative Operational Expenses
    const cumulative_operational_expenses = (allExpenses || []).filter((e: any) => {
      const cat = (e.category || '').toLowerCase();
      return cat === 'operasional';
    }).reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    // FINAL: Calculate Cumulative Profit
    const cumulative_profit = cumulative_pendapatan_bersih - cumulative_operational_expenses;

    // Backward compat: cumulative inventory_purchases
    const cumulative_inventory_purchases = (allExpenses || []).filter((e: any) => {
      const cat = (e.category || '').toLowerCase();
      return cat === 'bahan' || cat === 'peralatan';
    }).reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    // Cumulative expense by category
    const cumulative_expense_by_category = {
      bahan: 0,
      operasional: 0,
      peralatan: 0,
    };

    (allExpenses || []).forEach((expense: any) => {
      const cat = (expense.category || '').toLowerCase();
      if (cumulative_expense_by_category.hasOwnProperty(cat)) {
        cumulative_expense_by_category[cat as keyof typeof cumulative_expense_by_category] += getRecognizedExpenseAmount(expense);
      }
    });

    // Top Products (Today)
    const topProducts: NonNullable<DashboardMetrics['top_products']> = [];
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

    // Weekly profit (7-day breakdown)
    const dailyTotals = new Map<string, { revenue: number; operasional: number }>();
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(`${weekStartDate}T00:00:00`);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      dailyTotals.set(dayKey, { revenue: 0, operasional: 0 });
    }

    (weeklySales || []).forEach((sale: any) => {
      const dayKey = getSaleDateValue(sale, sessionDateMap);
      const current = dailyTotals.get(dayKey);
      if (current) {
        current.revenue += getRecognizedSaleAmount(sale);
      }
    });

    (weeklyExpenses || []).forEach((expense: any) => {
      const cat = (expense.category || '').toLowerCase();
      if (cat === 'operasional') {  // Only operasional affects profit
        const current = dailyTotals.get(expense.date);
        if (current) {
          current.operasional += getRecognizedExpenseAmount(expense);
        }
      }
    });

    const weekly_profit = Array.from(dailyTotals.entries()).map(([day, totals]) => ({
      date: day,
      profit: totals.revenue - totals.operasional,
      gross_revenue: totals.revenue,
    }));

    // ===== NEW: DETAILED DATA FOR EXPANDABLE CARDS =====

    // ===== DETAILED DATA FOR EXPANDABLE CARDS =====

    // Daily expense breakdown (operasional only)
    const daily_expenses_detailed = (expenses || [])
      .filter((e: any) => (e.category || '').toLowerCase() === 'operasional')
      .map((e: any) => ({
        description: e.description || 'Operasional',
        amount: getRecognizedExpenseAmount(e),
        category: 'operasional',
      }));

    // Average daily profit (cumulative profit / days with activity)
    const days_with_profit = weekly_profit.filter(d => d.profit !== 0).length || 1;
    const average_daily_profit = cumulative_profit / days_with_profit;

    // Profit detail object for expandable cards
    const profit_detail = {
      // Today (Harian) - new field names
      today_gross_revenue: today_gross_revenue,
      today_pendapatan_bersih: today_pendapatan_bersih,
      today_operational_expenses: today_operational_expenses,
      today_profit: today_profit,
      today_revenue_by_channel,
      daily_expenses_detailed,

      // Cumulative (Total) - new field names
      cumulative_gross_revenue,
      cumulative_pendapatan_bersih,
      cumulative_operational_expenses,
      cumulative_profit,
      cumulative_revenue_by_channel,

      // Breakdown & insights
      weekly_profit,
      average_daily_profit,

      // Legacy field names for ProfitToggleCard compatibility
      gross_revenue: today_gross_revenue,
      operational_expenses: today_operational_expenses,
      daily_revenue_by_channel: today_revenue_by_channel,
      total_gross_revenue: cumulative_gross_revenue,
      total_operational_expenses: cumulative_operational_expenses,
      cumulative_expenses_by_category: cumulative_expense_by_category,
      daily_breakdown: weekly_profit,
    };

    // NEW: Separate cash sources (Modal vs Sales)
    // Get ALL capital entries UP TO TODAY (cumulative, not just today)
    // Capital entries and cash sources
    const { data: capitalEntries } = await getSupabaseServer().from('capital_entries')
      .select('*')
      .eq('outlet_id', outletId)
      .lte('date', date);

    const cash_from_modal = (capitalEntries || []).reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0) || 0;
    const cash_from_sales = today_pendapatan_bersih; // Today's net revenue (after fee)

    // NEW: Get profit allocations UP TO TODAY (for kas operasional calculation)
    const { data: profitAllocations } = await getSupabaseServer().from('profit_allocations')
      .select('*')
      .eq('outlet_id', outletId)
      .lte('allocation_date', date);

    // TODAY's profit allocation
    const today_profit_allocated_to_kas = (profitAllocations || [])
      .filter((pa: any) => pa.allocation_date === date)
      .reduce((sum: number, pa: any) => sum + (pa.reserve_amount || 0), 0) || 0;

    // CUMULATIVE profit allocation
    const cumulative_profit_allocated_to_kas = (profitAllocations || [])
      .reduce((sum: number, pa: any) => sum + (pa.reserve_amount || 0), 0) || 0;

    // Separate expense sources (Kas vs Modal)
    const expense_from_kas = (expenses || [])
      .filter((e: any) => (e.funding_source || 'kas') === 'kas')
      .reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    const expense_from_modal = (expenses || [])
      .filter((e: any) => (e.funding_source || 'kas') === 'modal')
      .reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    // NEW: Available for distribution = Net Revenue - Modal needs
    const available_for_distribution = today_pendapatan_bersih - expense_from_modal;

    // NEW: Calculate KAS OPERASIONAL (TODAY)
    const today_available_cash = cash_from_modal + today_profit_allocated_to_kas - expense_from_kas;

    // NEW: Calculate KAS OPERASIONAL (CUMULATIVE)
    const cumulative_available_cash = cash_from_modal + cumulative_profit_allocated_to_kas - (allExpenses || [])
      .filter((e: any) => (e.funding_source || 'kas') === 'kas')
      .reduce((sum: number, e: any) => sum + getRecognizedExpenseAmount(e), 0) || 0;

    // NEW: Calculate SURPLUS/DEFICIT (TODAY)
    // Surplus = Available Cash - Profit (shows buffer or shortage)
    const today_surplus_deficit = today_available_cash - today_profit;

    // NEW: Calculate SURPLUS/DEFICIT (CUMULATIVE)
    const cumulative_surplus_deficit = cumulative_available_cash - cumulative_profit;

    // Build metrics object with both today and cumulative values
    const metrics: DashboardMetrics = {
      // Today (Harian)
      today_gross_revenue: today_gross_revenue,
      today_pendapatan_bersih: today_pendapatan_bersih,
      today_operational_expenses: today_operational_expenses,
      today_profit: today_profit,
      today_inventory_purchases: today_inventory_purchases,
      today_total_items_sold: today_total_items_sold,
      today_revenue_by_channel,
      today_expense_by_category,
      today_payment_methods,
      today_cash_inflow_by_channel,
      
      // Cumulative (Total)
      cumulative_gross_revenue,
      cumulative_pendapatan_bersih,
      cumulative_operational_expenses,
      cumulative_profit,
      cumulative_inventory_purchases,
      cumulative_total_items_sold,
      cumulative_revenue_by_channel,
      cumulative_expense_by_category,
      
      // Cash flow
      cash_from_modal,
      cash_from_sales,
      expense_from_kas,
      expense_from_modal,
      available_for_distribution,
      today_cash_inflow,
      today_cash_outflow,
      today_pending_sales,
      today_pending_expenses,
      cumulative_cash_inflow,
      cumulative_cash_outflow,
      
      // NEW: KAS OPERASIONAL (Modal + Alokasi Profit - Pengeluaran)
      today_profit_allocated_to_kas,
      cumulative_profit_allocated_to_kas,
      today_available_cash,
      cumulative_available_cash,
      
      // NEW: SURPLUS/DEFICIT (Cash vs Profit)
      today_surplus_deficit,
      cumulative_surplus_deficit,
      
      // NEW: HPP & FEE DETAILS (internal calcs, now exposed)
      today_total_hpp,
      cumulative_total_hpp,
      today_total_platform_fee,
      cumulative_total_platform_fee,
      today_fee_shopeefood,
      today_fee_gofood,
      cumulative_fee_shopeefood,
      cumulative_fee_gofood,
      
      // Products and weekly
      top_products: topProducts,
      weekly_profit,
      
      // Detailed data for expandable cards
      profit_detail: profit_detail as any,
      
      // Capital entries
      capital_entries: (capitalEntries || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        amount: e.amount,
        date: e.date,
      })),
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
