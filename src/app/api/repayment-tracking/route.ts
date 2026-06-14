/**
 * GET /api/repayment-tracking
 *
 * Get repayment tracking summary for dashboard
 * Shows aggregate cicilan payment data for outlet and month
 *
 * Query Params:
 * - outlet_id (required): Which outlet
 * - month (optional): Filter by month YYYY-MM (default: current month)
 *
 * Response:
 * {
 *   success: boolean,
 *   outlet_id: string,
 *   month: string,
 *   total_allocated: number,
 *   total_paid: number,
 *   outstanding: number,
 *   payment_percentage: number,
 *   recent_payments: [{investor_name, amount_paid, repayment_date, repayment_type}]
 * }
 */

export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    if (!outletId) {
      return NextResponse.json(
        { error: 'Missing required parameter: outlet_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get profit allocations for the month using stable existing columns.
    // This avoids depending on the newer hutang_payments JSON column that may not exist yet.
    const { data: allocations, error: allocError } = await supabase
      .from('profit_allocations')
      .select('id, outlet_id, allocation_month, total_profit, profit_pending_amount')
      .eq('outlet_id', outletId)
      .eq('allocation_month', month);

    if (allocError) throw allocError;

    // Calculate total allocated for cicilan using existing allocation fields.
    const totalAllocated = (allocations || []).reduce(
      (sum: Decimal, alloc: any) => sum.plus(new Decimal(alloc.total_profit || alloc.profit_pending_amount || 0)),
      new Decimal(0)
    );

    // Get repayment records from the existing capital_repayments table.
    // This is the safe fallback path for current schema state.
    const { data: repayments, error: rtError } = await supabase
      .from('capital_repayments')
      .select('id, investor_id, amount, repayment_date, method, notes')
      .order('repayment_date', { ascending: false });

    if (rtError) throw rtError;

    const investorIds = [...new Set((repayments || []).map((rt: any) => rt.investor_id).filter(Boolean))];
    const { data: investors, error: invError } = await supabase
      .from('investors')
      .select('id, name, outlet_id')
      .in('id', investorIds);

    if (invError) throw invError;

    const investorMap = new Map((investors || []).map((inv: any) => [inv.id, inv.name]));
    const outletInvestorIds = new Set((investors || []).filter((inv: any) => inv.outlet_id === outletId).map((inv: any) => inv.id));

    const filteredRepayments = (repayments || [])
      .filter((rt: any) => outletInvestorIds.has(rt.investor_id) && String(rt.repayment_date || '').slice(0, 7) === month)
      .sort((a: any, b: any) => String(b.repayment_date || '').localeCompare(String(a.repayment_date || '')));

    const totalPaid = filteredRepayments.reduce(
      (sum: Decimal, rt: any) => sum.plus(new Decimal(rt.amount || 0)),
      new Decimal(0)
    );

    const recentPayments = filteredRepayments.slice(0, 10).map((rt: any) => ({
      investor_name: investorMap.get(rt.investor_id) || 'Unknown',
      amount_paid: new Decimal(rt.amount || 0).toFixed(2),
      repayment_date: rt.repayment_date,
      repayment_type: 'cicilan',
    }));

    const outstanding = totalAllocated.minus(totalPaid);
    const paymentPercentage = totalAllocated.greaterThan(0)
      ? parseFloat((totalPaid.dividedBy(totalAllocated).times(100)).toFixed(1))
      : 0;

    return NextResponse.json({
      success: true,
      outlet_id: outletId,
      month,
      total_allocated: totalAllocated.toFixed(2),
      total_paid: totalPaid.toFixed(2),
      outstanding: outstanding.toFixed(2),
      payment_percentage: paymentPercentage,
      recent_payments: recentPayments,
    });
  } catch (error: any) {
    console.error('Error fetching repayment tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
