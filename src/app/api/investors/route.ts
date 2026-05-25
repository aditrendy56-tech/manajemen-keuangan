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

    const { data, error } = await getSupabaseServer().from('investors')
      .select('*')
      .eq('outlet_id', outletId)
      .order('priority_order', { ascending: true })
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
    const { outlet_id, name, phone, initial_contribution, priority_order, notes } = body;

    if (!outlet_id || !name || !initial_contribution) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await (getSupabaseServer().from('investors') as any)
      .insert([{
        outlet_id,
        name,
        phone,
        initial_contribution,
        remaining_balance: initial_contribution,
        status: 'active',
        priority_order: priority_order || 999
      }])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, remaining_balance, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Investor ID required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (remaining_balance !== undefined) updateData.remaining_balance = remaining_balance;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await (getSupabaseServer().from('investors') as any)
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
