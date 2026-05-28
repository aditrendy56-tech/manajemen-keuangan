export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { recordCashTransaction } from '@/lib/cash/ledger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    console.log('[GET /api/expenses] Fetching expenses for outlet:', outletId);

    const { data, error } = await getSupabaseServer().from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('[GET /api/expenses] Supabase error:', error);
      throw error;
    }

    console.log('[GET /api/expenses] Success, returned', data?.length, 'expenses');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GET /api/expenses] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, outlet_id, date, category, description, amount, notes } = body;

    console.log('[POST /api/expenses] Received:', { session_id, outlet_id, date, category, description, amount });

    if (!outlet_id || !date || !category || !description || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: outlet_id, date, category, description, amount' },
        { status: 400 }
      );
    }

    const { data, error } = await (getSupabaseServer().from('expenses') as any).insert([{ 
      session_id, 
      outlet_id, 
      date, 
      category, 
      description, 
      amount, 
      notes 
    }]).select();

    if (error) {
      console.error('[POST /api/expenses] Supabase error:', error);
      throw error;
    }

    await recordCashTransaction({
      outlet_id,
      transaction_date: date,
      transaction_type: 'outflow',
      source_type: 'expense',
      source_id: data[0]?.id,
      amount: Number(amount),
      description: description,
      notes: notes || null,
    });

    console.log('[POST /api/expenses] Success, created expense:', data[0]?.id);
    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/expenses] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
  }
}
