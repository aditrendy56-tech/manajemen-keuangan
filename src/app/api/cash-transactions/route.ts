export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '50';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer()
      .from('cash_transactions')
      .select('*')
      .eq('outlet_id', outletId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
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
      transaction_date,
      transaction_type,
      source_type,
      source_id,
      amount,
      description,
      notes,
    } = body;

    if (!outlet_id || !transaction_date || !transaction_type || !source_type || !amount || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const insertData = {
      outlet_id,
      transaction_date,
      transaction_type,
      source_type,
      source_id: source_id || null,
      amount,
      description,
      notes: notes || null,
    };

    const { data, error } = await (getSupabaseServer().from('cash_transactions') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
