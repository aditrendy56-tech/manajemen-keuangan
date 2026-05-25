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

    const { data, error } = await getSupabaseServer().from('capital_entries')
      .select('*')
      .eq('outlet_id', outletId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, date, amount, source, notes, investor_id, source_type, category, items } = body;

    if (!outlet_id || !date || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await (getSupabaseServer().from('capital_entries') as any)
      .insert([{ 
        outlet_id, 
        date, 
        amount, 
        source, 
        notes,
        investor_id,
        source_type,
        category,
        items: items || null
      }])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
