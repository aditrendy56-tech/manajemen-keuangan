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

    // Get profit allocations for the month
    const { data: allocations, error: allocError } = await supabase
      .from('profit_allocations')
      .select('id, outlet_id, allocation_month, hutang_payments')
      .eq('outlet_id', outletId)
      .eq('allocation_month', month);

    if (allocError) throw allocError;

    // Calculate total allocated for cicilan
    let totalAllocated = new Decimal(0);
    (allocations || []).forEach((alloc: any) => {
      if (alloc.hutang_payments) {
        Object.values(alloc.hutang_payments).forEach((payment: any) => {
          const amount = (payment as any)?.amount || 0;
          totalAllocated = totalAllocated.plus(new Decimal(amount));
        });
      }
    });

    // Get repayment tracking for the month
    const { data: repayments, error: rtError } = await supabase
      .from('repayment_tracking')
      .select('id, investor_id, amount_paid, repayment_date, repayment_type')
      .eq('outlet_id', outletId)
      .eq('repayment_type', 'cicilan')
      .order('repayment_date', { ascending: false });

    if (rtError) throw rtError;

    // Filter repayments by month
    const filteredRepayments = (repayments || []).filter((rt: any) => {
      const rtMonth = rt.repayment_date.slice(0, 7);
      return rtMonth === month;
    });

    // Calculate total paid
    const totalPaid = filteredRepayments.reduce(
      (sum: Decimal, rt: any) => sum.plus(new Decimal(rt.amount_paid)),
      new Decimal(0)
    );

    // Get investor names for recent payments
    const investorIds = [...new Set(filteredRepayments.map((rt: any) => rt.investor_id))];
    const { data: investors, error: invError } = await supabase
      .from('investors')
      .select('id, name')
      .in('id', investorIds);

    if (invError) throw invError;

    const investorMap = new Map((investors || []).map((inv: any) => [inv.id, inv.name]));

    // Prepare recent payments with investor names
    const recentPayments = filteredRepayments.slice(0, 10).map((rt: any) => ({
      investor_name: investorMap.get(rt.investor_id) || 'Unknown',
      amount_paid: new Decimal(rt.amount_paid).toFixed(2),
      repayment_date: rt.repayment_date,
      repayment_type: rt.repayment_type,
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
