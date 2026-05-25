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

    // Calculate metrics
    const gross_revenue = sales?.reduce((sum: number, s: any) => sum + (s.net_amount || 0), 0) || 0;
    const total_expenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const platform_fees =
      sales?.reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) || 0;
    const profit = gross_revenue - total_expenses;

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

    const metrics: DashboardMetrics = {
      today_gross_revenue: gross_revenue,
      today_net_revenue: gross_revenue,
      today_profit: profit,
      revenue_by_channel,
      payment_methods,
      top_products: [],
      weekly_profit: [],
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
