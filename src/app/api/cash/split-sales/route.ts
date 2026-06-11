/**
 * POST /api/cash/split-sales
 * 
 * Manually trigger sale split between Kas Utama (60%) and Profit Pending (40%)
 * Can be used standalone or called automatically from POST /api/sales
 * 
 * Request:
 * {
 *   outlet_id: string,
 *   sale_id: string,
 *   gross_amount: number,
 *   platform_fee?: number
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   kas_utama_amount: number,
 *   profit_pending_amount: number,
 *   total_net: number
 * }
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { splitSalesTransaction } from '@/lib/cash/dual-bucket-v2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, sale_id, gross_amount, platform_fee } = body;

    // Validate required fields
    if (!outlet_id || !sale_id || typeof gross_amount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: outlet_id, sale_id, gross_amount' },
        { status: 400 }
      );
    }

    if (gross_amount <= 0) {
      return NextResponse.json(
        { error: 'gross_amount must be positive' },
        { status: 400 }
      );
    }

    // Execute split
    const split = await splitSalesTransaction(
      outlet_id,
      sale_id,
      gross_amount,
      platform_fee || 0
    );

    return NextResponse.json(
      {
        success: true,
        kas_utama_amount: split.kas_utama_amount,
        profit_pending_amount: split.profit_pending_amount,
        total_net: split.kas_utama_amount + split.profit_pending_amount,
        platform_fee: split.platform_fee,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/cash/split-sales] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
