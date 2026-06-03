export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('products')
      .select('*')
      .eq('outlet_id', outletId)
      .order('name');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, name, description, price, price_offline, price_shopeefood, price_gofood, is_active } = body;

    if (!outlet_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // prefer explicit channel prices, fallback to legacy `price` if provided
    const fallbackPrice = price_offline ?? price_shopeefood ?? price_gofood ?? price ?? null;
    const insertData: any = {
      outlet_id,
      name,
      description,
      is_active: is_active !== undefined ? is_active : true,
      price: fallbackPrice,
      price_offline: price_offline ?? price ?? null,
      price_shopeefood: price_shopeefood ?? price ?? null,
      price_gofood: price_gofood ?? price ?? null,
    };
    const { data, error } = await (getSupabaseServer().from('products') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { data, error } = await (getSupabaseServer().from('products') as any)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
