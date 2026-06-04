export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer()
      .from('profit_allocations')
      .select('*')
      .eq('outlet_id', outletId)
      .order('allocation_date', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      outlet_id,
      allocation_date,
      period_label,
      total_profit,
      reserve_amount,
      distributed_amount,
      notes,
    } = body;

    if (!outlet_id || !allocation_date || total_profit === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const total = parseFloat(total_profit);
    const reserve = reserve_amount !== undefined && reserve_amount !== ''
      ? parseFloat(reserve_amount)
      : 0;
    const distributed = distributed_amount !== undefined && distributed_amount !== ''
      ? parseFloat(distributed_amount)
      : Math.max(0, total - reserve);

    const insertData = {
      outlet_id,
      allocation_date,
      period_label: period_label || null,
      total_profit: total,
      reserve_amount: reserve,
      distributed_amount: distributed,
      notes: notes || null,
    };

    const { data, error } = await (getSupabaseServer().from('profit_allocations') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
