/**
 * GET /api/cash/financial-summary?outlet_id=xxx
 * 
 * Real-time financial summary dengan dual-bucket structure
 * 
 * Returns:
 * {
 *   kas_utama: number,
 *   profit_pending: number,
 *   simpan_uang: number,
 *   total_available: number,
 *   last_updated: string,
 *   debug?: { ... }
 * }
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFinancialBalance, getProfitPendingForMonth } from '@/lib/cash/dual-bucket-v2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const includeMonth = searchParams.get('month'); // Optional: "2026-06"
    const debug = searchParams.get('debug') === 'true';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(outletId);
    if (!isValidUuid) {
      return NextResponse.json({ error: 'outlet_id must be a valid UUID' }, { status: 400 });
    }

    // Get real-time balance
    const balance = await getFinancialBalance(outletId);

    let response: any = {
      kas_utama: balance.kas_utama,
      profit_pending: balance.profit_pending,
      simpan_uang: balance.simpan_uang,
      total_available: balance.total_available,
      last_updated: balance.last_updated,
    };

    // Optional: Include month-specific profit pending transactions
    if (includeMonth && /^\d{4}-\d{2}$/.test(includeMonth)) {
      const monthlyProfit = await getProfitPendingForMonth(outletId, includeMonth);
      response.monthly_profit_pending = monthlyProfit;
    }

    // Optional: Include debug info
    if (debug) {
      response.debug = {
        outlet_id: outletId,
        timestamp: new Date().toISOString(),
        note: 'Debug mode - includes metadata',
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[GET /api/cash/financial-summary] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
