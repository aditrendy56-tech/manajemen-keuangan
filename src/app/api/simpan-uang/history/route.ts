/**
 * GET /api/simpan-uang/history?outlet_id=xxx&month=2026-06
 * 
 * Get all Simpan Uang allocations dengan history dan reallocation tracking
 * 
 * Returns:
 * [
 *   {
 *     id: string,
 *     outlet_id: string,
 *     allocation_month: string,
 *     amount: number,
 *     reason: string,
 *     status: 'active' | 'reallocated' | 'used' | 'archived',
 *     reallocated_at?: string,
 *     reallocated_amount?: number,
 *     created_at: string,
 *     notes?: string
 *   }
 * ]
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const month = searchParams.get('month'); // Optional filter
    const status = searchParams.get('status'); // Optional filter: active|reallocated|used|archived

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    let query = supabase
      .from('simpan_uang_allocations')
      .select('*')
      .eq('outlet_id', outletId);

    if (month) {
      query = query.eq('allocation_month', month);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[GET /api/simpan-uang/history] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/simpan-uang/history
 * 
 * Record new Simpan Uang allocation from profit allocation flow
 * 
 * Request:
 * {
 *   outlet_id: string,
 *   allocation_month: string,  // "2026-06"
 *   amount: number,
 *   reason: string,
 *   created_by?: string
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, allocation_month, amount, reason, created_by, notes } = body;

    // Validate required fields
    if (!outlet_id || !allocation_month || !amount || !reason) {
      return NextResponse.json(
        {
          error: 'Missing required fields: outlet_id, allocation_month, amount, reason',
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Insert new allocation
    const { data, error } = await supabase
      .from('simpan_uang_allocations')
      .insert({
        outlet_id,
        allocation_month,
        amount,
        reason,
        status: 'active',
        created_at: new Date().toISOString(),
        created_by: created_by || 'system',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/simpan-uang/history] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
