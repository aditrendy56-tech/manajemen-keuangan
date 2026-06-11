export const dynamic = 'force-dynamic';

/**
 * GET /api/investors/[id]/hutang-status
 * 
 * Get investor repayment status (LUNAS / CICIL / BELUM)
 * Calculates total modal vs total paid to determine status
 * 
 * Response:
 * {
 *   investor_id: string,
 *   total_modal: number,
 *   total_repaid: number,
 *   outstanding: number,
 *   status: 'lunas' | 'cicil' | 'belum',
 *   percentage_paid: number
 * }
 */

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from 'decimal.js';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: investorId } = await params;

    if (!investorId) {
      return NextResponse.json({ error: 'investor_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Get total modal dari capital_entries
    const { data: capitalEntries, error: capitalError } = await supabase
      .from('capital_entries')
      .select('amount')
      .eq('investor_id', investorId);

    if (capitalError) throw capitalError;

    const totalModalAmount = (capitalEntries || [])
      .reduce((sum, row) => sum + new Decimal(row.amount || 0).toNumber(), 0);

    // Get total repayment dari capital_repayments (sum all repayments - no status filter)
    const { data: repayments, error: repaymentError } = await supabase
      .from('capital_repayments')
      .select('amount')
      .eq('investor_id', investorId);

    if (repaymentError) throw repaymentError;

    const totalRepaidAmount = (repayments || [])
      .reduce((sum, row) => sum + new Decimal(row.amount || 0).toNumber(), 0);

    // Calculate outstanding
    const outstanding = new Decimal(totalModalAmount)
      .minus(totalRepaidAmount)
      .toNumber();

    // Determine status
    let status: 'lunas' | 'cicil' | 'belum' = 'belum';
    
    if (totalModalAmount === 0) {
      // No modal = BELUM (or LUNAS if owner/karyawan)
      status = 'belum';
    } else if (outstanding <= 0) {
      // All paid
      status = 'lunas';
    } else {
      // Partial payment
      status = 'cicil';
    }

    const percentagePaid = totalModalAmount > 0
      ? (totalRepaidAmount / totalModalAmount) * 100
      : 0;

    return NextResponse.json({
      investor_id: investorId,
      total_modal: parseFloat(totalModalAmount.toFixed(2)),
      total_repaid: parseFloat(totalRepaidAmount.toFixed(2)),
      outstanding: parseFloat(outstanding.toFixed(2)),
      status,
      percentage_paid: parseFloat(percentagePaid.toFixed(2)),
    });
  } catch (error: any) {
    console.error('[GET /api/investors/:id/hutang-status] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
