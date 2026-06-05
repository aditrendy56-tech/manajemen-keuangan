export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { calculateCashBalance, validateExpenseTransaction } from '@/lib/cash/validation';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cash/balance?outlet_id=xxx
 * Ambil current cash balance dan status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const validateAmount = searchParams.get('validate_amount');

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    if (validateAmount) {
      // Mode: Validate sebelum expense
      const amount = parseFloat(validateAmount);
      if (isNaN(amount)) {
        return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
      }

      const validation = await validateExpenseTransaction(outletId, amount);
      return NextResponse.json(validation);
    }

    // Mode: Ambil balance info
    const balance = await calculateCashBalance(outletId);
    return NextResponse.json(balance);
  } catch (error: any) {
    console.error('[GET /api/cash/balance] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
