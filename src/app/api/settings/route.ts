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

    const { data, error } = await getSupabaseServer()
      .from('outlet_settings')
      .select('*')
      .eq('outlet_id', outletId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      return NextResponse.json(data);
    }

    return NextResponse.json({
      outlet_id: outletId,
      business_name: '',
      outlet_name: '',
      address: '',
      phone: '',
      currency: 'IDR',
    });
  } catch (error: any) {
    const message = error?.message || '';
    if (
      message.includes('outlet_settings') &&
      (message.includes('does not exist') || message.includes('schema cache'))
    ) {
      return NextResponse.json({
        outlet_id: request.nextUrl.searchParams.get('outlet_id'),
        business_name: '',
        outlet_name: '',
        address: '',
        phone: '',
        currency: 'IDR',
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, business_name, outlet_name, address, phone, currency } = body;

    if (!outlet_id || !business_name || !outlet_name) {
      return NextResponse.json(
        { error: 'outlet_id, business_name, and outlet_name required' },
        { status: 400 }
      );
    }

    const payload = {
      outlet_id,
      business_name,
      outlet_name,
      address: address || '',
      phone: phone || '',
      currency: currency || 'IDR',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseServer()
      .from('outlet_settings')
      .upsert(payload, { onConflict: 'outlet_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}