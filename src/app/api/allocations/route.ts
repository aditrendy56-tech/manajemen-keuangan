export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { computeAllocationPreview, executeAllocation } from '@/lib/allocation/engine';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const outletId = params.get('outlet_id');
    if (!outletId) return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    const { data, error } = await getSupabaseServer().from('allocation_runs').select('*').eq('outlet_id', outletId).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outlet_id, month, year, rule_id, dry_run, run_by } = body;
    if (!outlet_id || !month || !year) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    // load rule
    let rule = null;
    if (rule_id) {
      const { data: r } = await getSupabaseServer().from('allocation_rules').select('*').eq('id', rule_id).limit(1).single();
      rule = r;
    } else {
      const { data: r } = await getSupabaseServer().from('allocation_rules').select('*').eq('outlet_id', outlet_id).order('created_at', { ascending: true }).limit(1);
      rule = (r && r[0]) || null;
    }

    if (dry_run) {
      const preview = await computeAllocationPreview(outlet_id, Number(month), Number(year), rule);
      return NextResponse.json({ preview });
    }

    const result = await executeAllocation(outlet_id, Number(month), Number(year), rule, run_by || null);
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
