export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { DashboardMetrics } from '@/types';

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

    // Get today's sales
    const { data: sales } = await getSupabaseServer().from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    // Get today's expenses
    const { data: expenses } = await getSupabaseServer().from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('date', date);

    // Get weekly sales and expenses for profit chart
    const { data: weeklySales } = await getSupabaseServer().from('sales')
      .select('id, created_at, gross_amount, net_amount, platform_fee')
      .eq('outlet_id', outletId)
      .gte('created_at', `${weekStartDate}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    const { data: weeklyExpenses } = await getSupabaseServer().from('expenses')
      .select('date, amount')
      .eq('outlet_id', outletId)
      .gte('date', weekStartDate)
      .lte('date', date);

    // Calculate metrics
    const gross_revenue = sales?.reduce((sum: number, s: any) => sum + (s.gross_amount || 0), 0) || 0;
    const net_revenue = sales?.reduce((sum: number, s: any) => sum + (s.net_amount || 0), 0) || 0;
    const total_expenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const platform_fees =
      sales?.reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) || 0;
    const profit = net_revenue - total_expenses;

    // Revenue by channel
    const revenue_by_channel = {
      offline: 0,
      shopeefood: 0,
      gofood: 0,
    };

    sales?.forEach((sale: any) => {
      if (revenue_by_channel.hasOwnProperty(sale.channel)) {
        revenue_by_channel[sale.channel as keyof typeof revenue_by_channel] +=
          sale.net_amount || 0;
      }
    });

    // Payment methods
    const payment_methods = {
      cash: 0,
      qris: 0,
    };

    sales?.forEach((sale: any) => {
      if (payment_methods.hasOwnProperty(sale.payment_method)) {
        payment_methods[sale.payment_method as keyof typeof payment_methods] +=
          sale.net_amount || 0;
      }
    });

    const topProducts = [] as DashboardMetrics['top_products'];
    const saleIds = sales?.map((sale: any) => sale.id) || [];
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

    weeklySales?.forEach((sale: any) => {
      const dayKey = new Date(sale.created_at).toISOString().split('T')[0];
      const current = dailyTotals.get(dayKey);
      if (current) {
        current.revenue += sale.net_amount || 0;
      }
    });

    weeklyExpenses?.forEach((expense: any) => {
      const current = dailyTotals.get(expense.date);
      if (current) {
        current.expense += expense.amount || 0;
      }
    });

    const weekly_profit = Array.from(dailyTotals.entries()).map(([day, totals]) => ({
      date: day,
      profit: totals.revenue - totals.expense,
    }));

    const metrics: DashboardMetrics = {
      today_gross_revenue: gross_revenue,
      today_net_revenue: net_revenue,
      today_profit: profit,
      revenue_by_channel,
      payment_methods,
      top_products: topProducts,
      weekly_profit,
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
