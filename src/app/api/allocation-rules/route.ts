export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const outletId = params.get('outlet_id');
    if (!outletId) return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    const supabase = getSupabaseServer();
    let { data, error } = await supabase.from('allocation_rules').select('*').eq('outlet_id', outletId).order('created_at', { ascending: true });
    if (error) throw error;

    // Auto-seed a default rule if none exists for this outlet
    if ((!data || data.length === 0)) {
      const defaultRule = {
        outlet_id: outletId,
        name: 'Default rule',
        recover_first: true,
        cash_reserve_percent: 10,
        allow_overdraft: false,
      } as const;
      const { data: inserted, error: insErr } = await supabase.from('allocation_rules').insert([defaultRule]).select().single();
      if (insErr) throw insErr;
      return NextResponse.json([inserted]);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outlet_id, name, recover_first, cash_reserve_percent, allow_overdraft } = body;
    if (!outlet_id) return NextResponse.json({ error: 'Missing outlet_id' }, { status: 400 });
    const insert = {
      outlet_id,
      name: name || 'Default rule',
      recover_first: recover_first === undefined ? true : Boolean(recover_first),
      cash_reserve_percent: Number(cash_reserve_percent || 10),
      allow_overdraft: Boolean(allow_overdraft || false),
    };
    const { data, error } = await getSupabaseServer().from('allocation_rules').insert([insert]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
