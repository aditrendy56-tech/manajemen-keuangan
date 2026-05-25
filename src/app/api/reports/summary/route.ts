export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ProfitLossReport } from '@/types';

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

    // Calculate metrics
    const gross_revenue = sales?.reduce((sum: number, s: any) => sum + (s.gross_amount || 0), 0) || 0;
    const net_revenue = sales?.reduce((sum: number, s: any) => sum + (s.net_amount || 0), 0) || 0;
    const platform_fees = sales?.reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) || 0;

    // Expenses by category
    const expenses_by_category: Record<string, number> = {};
    let total_expenses = 0;

    expenses?.forEach((expense: any) => {
      expenses_by_category[expense.category] =
        (expenses_by_category[expense.category] || 0) + (expense.amount || 0);
      total_expenses += expense.amount || 0;
    });

    const gross_profit = net_revenue - total_expenses;
    const profit_margin = gross_revenue > 0 ? (gross_profit / gross_revenue) * 100 : 0;

    const report: ProfitLossReport = {
      gross_revenue,
      platform_fees,
      net_revenue,
      total_expenses,
      expenses_by_category,
      gross_profit,
      net_profit: gross_profit,
      profit_margin,
    };

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
