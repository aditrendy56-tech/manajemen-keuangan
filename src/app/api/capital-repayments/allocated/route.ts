/**
 * GET /api/capital-repayments/allocated
 *
 * Get allocated cicilan for pembayaran form
 * Shows what cicilan can be paid based on Alokasi Laba allocations
 *
 * Query Params:
 * - investor_id (required): Which investor
 * - outlet_id (required): Which outlet
 * - month (optional): Filter by month YYYY-MM (default: current month)
 *
 * Response:
 * {
 *   success: boolean,
 *   investor_id: string,
 *   outlet_id: string,
 *   month: string,
 *   allocations: [
 *     {
 *       allocation_id: string,
 *       allocation_date: string,
 *       profit_share: number,
 *       payment_method: string,
 *       cicilan_info: {
 *         cicilan_amount: number,
 *         cicilan_months: number,
 *         cicilan_start_date: string,
 *         cicilan_monthly: number,
 *         allocated_cicilan: number
 *       },
 *       available_for_payment: number,
 *       already_paid: number,
 *       remaining_from_allocation: number,
 *       cicilan_schedule_items: [
 *         {
 *           cicilan_number: number,
 *           due_date: string,
 *           cicilan_amount: number,
 *           status: 'pending' | 'paid' | 'overdue',
 *           paid_date: string | null
 *         }
 *       ]
 *     }
 *   ],
 *   totals: {
 *     total_allocated: number,
 *     total_already_paid: number,
 *     total_available: number
 *   }
 * }
 */

export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const investorId = searchParams.get('investor_id');
    const outletId = searchParams.get('outlet_id');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    if (!investorId || !outletId) {
      return NextResponse.json(
        { error: 'Missing required parameters: investor_id, outlet_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get hutang info from capital_entries
    const { data: capitalEntries, error: ceError } = await supabase
      .from('capital_entries')
      .select('id, amount, hutang_status, cicilan_amount, cicilan_months, cicilan_start_date')
      .eq('investor_id', investorId)
      .eq('outlet_id', outletId)
      .eq('hutang_status', 'cicilan');

    if (ceError) throw ceError;

    if (!capitalEntries || capitalEntries.length === 0) {
      return NextResponse.json({
        success: true,
        investor_id: investorId,
        outlet_id: outletId,
        month,
        allocations: [],
        totals: {
          total_allocated: 0,
          total_already_paid: 0,
          total_available: 0,
        },
      });
    }

    // NOTE: repayment_tracking & cicilan_schedule tables created in Phase 4 migration
    // For now, return empty allocations to allow form to work before Phase 4 execution
    // These will be populated after Phase 4 migration is executed in Supabase
    
    const allocations: any[] = [];
    const repaymentTracking: any[] = [];
    const cicilanSchedule: any[] = [];

    // Build response (simplified for MVP - Phase 4 tracking not yet enabled)
    // After Phase 4 migration, this will show detailed allocation history
    const capital = capitalEntries[0];
    const cicilan_monthly = new Decimal(capital.cicilan_amount || 0)
      .dividedBy(new Decimal(capital.cicilan_months || 1));

    // For now, return basic cicilan info without allocation tracking
    // Allocations will be tracked after Phase 4 migration execution
    const allocationDetails = allocations.length === 0 ? [
      {
        allocation_id: 'pending',
        allocation_date: new Date().toISOString().split('T')[0],
        profit_share: '0',
        payment_method: 'pending',
        cicilan_info: {
          cicilan_amount: new Decimal(capital.cicilan_amount || 0).toFixed(2),
          cicilan_months: capital.cicilan_months,
          cicilan_start_date: capital.cicilan_start_date,
          cicilan_monthly: cicilan_monthly.toFixed(2),
          allocated_cicilan: '0',
        },
        available_for_payment: '0',
        already_paid: '0',
        remaining_from_allocation: '0',
        cicilan_schedule_items: [],
      }
    ] : (allocations || []).map((alloc: any) => {
      const allocatedForInvestor = alloc.hutang_payments?.[investorId];
      const allocatedAmount = new Decimal(allocatedForInvestor?.amount || 0);

      // Calculate already paid from this allocation
      const paidFromThisAllocation = (repaymentTracking || [])
        .filter((rt: any) => rt.profit_allocation_id === alloc.id)
        .reduce((sum: Decimal, rt: any) => sum.plus(new Decimal(rt.amount_paid)), new Decimal(0));

      const availableForPayment = allocatedAmount.minus(paidFromThisAllocation);

      // Get cicilan items for this allocation
      const relevantCicilans = (cicilanSchedule || [])
        .filter((cs: any) => {
          // Map cicilan to capital entry
          return cs.capital_entry_id === capital.id && cs.status !== 'cancelled';
        });

      return {
        allocation_id: alloc.id,
        allocation_date: alloc.allocation_date,
        profit_share: '0',
        payment_method: 'pending',
        cicilan_info: {
          cicilan_amount: new Decimal(capital.cicilan_amount || 0).toFixed(2),
          cicilan_months: capital.cicilan_months,
          cicilan_start_date: capital.cicilan_start_date,
          cicilan_monthly: cicilan_monthly.toFixed(2),
          allocated_cicilan: allocatedAmount.toFixed(2),
        },
        available_for_payment: availableForPayment.toFixed(2),
        already_paid: paidFromThisAllocation.toFixed(2),
        remaining_from_allocation: allocatedAmount.toFixed(2),
        cicilan_schedule_items: relevantCicilans.map((cs: any) => ({
          cicilan_number: cs.cicilan_number,
          due_date: cs.due_date,
          cicilan_amount: new Decimal(cs.cicilan_amount).toFixed(2),
          status: cs.status,
          paid_date: cs.paid_date,
        })),
      };
    });

    // Calculate totals
    const totalAllocated = allocationDetails.reduce(
      (sum: Decimal, alloc: any) => sum.plus(new Decimal(alloc.allocated_cicilan)),
      new Decimal(0)
    );
    const totalPaid = allocationDetails.reduce(
      (sum: Decimal, alloc: any) => sum.plus(new Decimal(alloc.already_paid)),
      new Decimal(0)
    );
    const totalAvailable = allocationDetails.reduce(
      (sum: Decimal, alloc: any) => sum.plus(new Decimal(alloc.available_for_payment)),
      new Decimal(0)
    );

    return NextResponse.json({
      success: true,
      investor_id: investorId,
      outlet_id: outletId,
      month,
      allocations: allocationDetails,
      totals: {
        total_allocated: totalAllocated.toFixed(2),
        total_already_paid: totalPaid.toFixed(2),
        total_available: totalAvailable.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error fetching allocated cicilan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
