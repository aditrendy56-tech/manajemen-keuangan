export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const outletId = params.get('outlet_id');
    
    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Fetch current allocation rule (is_current = true)
    const { data, error } = await supabase
      .from('allocation_rules')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('is_current', true)
      .order('approved_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is ok, means no current rule)
      throw error;
    }

    if (!data) {
      // No current rule exists - should not happen in production but handle gracefully
      return NextResponse.json(
        { error: 'No current allocation rule found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching allocation rules:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch allocation rules' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      outlet_id,
      kas_utama_percent,
      profit_pending_percent,
      approved_by,
      reason,
    } = body;

    if (!outlet_id) {
      return NextResponse.json({ error: 'Missing outlet_id' }, { status: 400 });
    }

    if (!kas_utama_percent || !profit_pending_percent) {
      return NextResponse.json(
        { error: 'Missing kas_utama_percent or profit_pending_percent' },
        { status: 400 }
      );
    }

    // Validate percentages sum to 100
    if (Math.abs(kas_utama_percent + profit_pending_percent - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Percentages must sum to 100' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Mark existing current rule as no longer current
    const { error: updateErr } = await (supabase as any)
      .from('allocation_rules')
      .update({ is_current: false })
      .eq('outlet_id', outlet_id)
      .eq('is_current', true);

    if (updateErr) throw updateErr;

    // Create new allocation rule
    const { data, error } = await supabase
      .from('allocation_rules')
      .insert([
        {
          outlet_id,
          kas_utama_percent,
          profit_pending_percent,
          effective_from_date: new Date().toISOString().split('T')[0],
          is_current: true,
          approved_by,
          reason,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating allocation rule:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create allocation rule' },
      { status: 500 }
    );
  }
}
