export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/buku-closings
 * Get list of buku closing records
 * 
 * Query params:
 *   outlet_id (required)
 *   period_id (optional)
 *   limit (optional, default 12)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const periodId = searchParams.get('period_id');
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!outletId) {
      return NextResponse.json(
        { error: 'Missing required parameter: outlet_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    let query = supabase
      .from('buku_closings')
      .select(`
        id,
        outlet_id,
        period_id,
        total_revenue,
        total_sales_transactions,
        actual_operational_spent,
        allocated_operational_buffer,
        variance,
        variance_percent,
        allocation_changed,
        closed_at,
        closed_by,
        periods(period_month)
      `)
      .eq('outlet_id', outletId)
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      closings: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
