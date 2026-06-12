export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/periods
 * Get list of periods (active/closed)
 * 
 * Query params:
 *   outlet_id (required)
 *   status (optional): 'active' | 'closed'
 *   limit (optional, default 12)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const status = searchParams.get('status'); // 'active' | 'closed' | null (all)
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!outletId) {
      return NextResponse.json(
        { error: 'Missing required parameter: outlet_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    let query = supabase
      .from('periods')
      .select('*')
      .eq('outlet_id', outletId)
      .order('period_start_date', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      periods: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/periods/close
 * Close a period (tutup buku)
 * 
 * Body:
 * {
 *   outlet_id: string,
 *   period_id: string,
 *   allocation_change_approved?: {
 *     new_kas_utama_percent: number,
 *     new_profit_pending_percent: number,
 *     reason: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      outlet_id,
      period_id,
      allocation_change_approved,
    } = body;

    if (!outlet_id || !period_id) {
      return NextResponse.json(
        { error: 'Missing required fields: outlet_id, period_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 1. Get period
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select('*')
      .eq('id', period_id)
      .eq('outlet_id', outlet_id)
      .single();

    if (periodError || !period) {
      throw new Error('Period not found');
    }

    if (period.status === 'closed') {
      return NextResponse.json(
        { error: 'Period already closed' },
        { status: 400 }
      );
    }

    // 2. Lock all sessions in this period
    const { error: lockError } = await (supabase
      .from('daily_sessions') as any)
      .update({
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: 'system', // TODO: get actual user
      })
      .eq('period_id', period_id);

    if (lockError) throw lockError;

    // 3. Calculate financial summary
    const { data: sessions } = await supabase
      .from('daily_sessions')
      .select('total_sales')
      .eq('period_id', period_id);

    const totalRevenue = sessions?.reduce(
      (sum: number, s: any) => sum + (parseFloat(s.total_sales) || 0),
      0
    ) || 0;

    // 4. Get current allocation rule
    const { data: currentRule } = await supabase
      .from('allocation_rules')
      .select('*')
      .eq('outlet_id', outlet_id)
      .eq('is_current', true)
      .single();

    const allocatedBuffer = totalRevenue * (currentRule?.kas_utama_percent || 60) / 100;
    const variance = allocatedBuffer - (0); // TODO: track actual operational spent
    const variancePercent = totalRevenue > 0 ? (variance / totalRevenue * 100) : 0;

    // 5. Handle allocation rule change (if applicable)
    let nextRuleId = currentRule?.id;
    let allocationChanged = false;

    if (allocation_change_approved) {
      const { new_kas_utama_percent, new_profit_pending_percent, reason } = 
        allocation_change_approved;

      // Create new rule
      const { data: newRule, error: ruleError } = await (supabase
        .from('allocation_rules') as any)
        .insert([{
          outlet_id,
          kas_utama_percent: new_kas_utama_percent,
          profit_pending_percent: new_profit_pending_percent,
          effective_from_date: new Date(period.period_end_date).toISOString().split('T')[0],
          effective_to_date: null,
          is_current: true,
          approved_by: 'system',
          reason: reason || 'Changed during period close',
          previous_rule_id: currentRule?.id,
        }])
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Mark old rule as not current
      await (supabase
        .from('allocation_rules') as any)
        .update({ is_current: false, effective_to_date: period.period_end_date })
        .eq('id', currentRule?.id);

      nextRuleId = newRule?.id;
      allocationChanged = true;
    }

    // 6. Create buku_closing record
    const { data: bukuClosing, error: bukuError } = await (supabase
      .from('buku_closings') as any)
      .insert([{
        outlet_id,
        period_id,
        total_revenue: totalRevenue,
        total_sales_transactions: sessions?.length || 0,
        actual_operational_spent: 0, // TODO: calculated from expense tracking
        allocated_operational_buffer: allocatedBuffer,
        variance: variance,
        variance_percent: variancePercent,
        current_allocation_rule_id: currentRule?.id,
        next_allocation_rule_id: nextRuleId,
        allocation_changed: allocationChanged,
        closed_by: 'system',
      }])
      .select()
      .single();

    if (bukuError) throw bukuError;

    // 7. Close period
    const { error: closeError } = await (supabase
      .from('periods') as any)
      .update({
        status: 'closed',
        is_locked: true,
        closed_at: new Date().toISOString(),
        closed_by: 'system',
      })
      .eq('id', period_id);

    if (closeError) throw closeError;

    // 8. Create next period (automatically)
    const nextPeriodStart = new Date(period.period_end_date);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1); // Next day is start of new period

    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    nextPeriodEnd.setDate(5); // 5th of next month

    const nextMonthStr = nextPeriodStart.toISOString().slice(0, 7); // YYYY-MM

    const { error: nextPeriodError } = await (supabase
      .from('periods') as any)
      .insert([{
        outlet_id,
        period_month: nextMonthStr,
        period_start_date: nextPeriodStart.toISOString().split('T')[0],
        period_end_date: nextPeriodEnd.toISOString().split('T')[0],
        status: 'active',
        is_locked: false,
      }])
      .select();

    // Ignore error if next period already exists
    // if (nextPeriodError && !nextPeriodError.message.includes('duplicate')) throw nextPeriodError;

    return NextResponse.json({
      success: true,
      buku_closing_id: bukuClosing?.id,
      summary: {
        period_closed: period.period_month,
        sessions_locked: sessions?.length || 0,
        total_revenue: totalRevenue,
        variance_percent: variancePercent.toFixed(2),
        variance_interpretation: variancePercent > 10 ? 'Over-allocated' : variancePercent < -10 ? 'Under-allocated' : 'Balanced',
        allocation_changed: allocationChanged,
        next_allocation_rule: allocationChanged ? {
          kas_utama_percent: allocation_change_approved?.new_kas_utama_percent,
          profit_pending_percent: allocation_change_approved?.new_profit_pending_percent,
          effective_from: new Date(period.period_end_date).toISOString().split('T')[0],
        } : null,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/periods]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
