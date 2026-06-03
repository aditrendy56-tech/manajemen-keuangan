export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const outletId = request.nextUrl.searchParams.get('outlet_id');

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('outlet_settings')
      .select('*')
      .eq('outlet_id', outletId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(
      data || {
        outlet_id: outletId,
        business_name: '',
        outlet_name: '',
        address: '',
        phone: '',
        currency: 'IDR',
        fee_shopeefood: 0.2,
        fee_gofood: 0.25,
      }
    );
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('outlet_settings') && (message.includes('does not exist') || message.includes('schema cache'))) {
      return NextResponse.json({
        outlet_id: request.nextUrl.searchParams.get('outlet_id'),
        business_name: '',
        outlet_name: '',
        address: '',
        phone: '',
        currency: 'IDR',
        fee_shopeefood: 0.2,
        fee_gofood: 0.25,
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      outlet_id,
      business_name,
      outlet_name,
      address,
      phone,
      currency,
      fee_shopeefood,
      fee_gofood,
    } = body;

    if (!outlet_id) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const payload = {
      outlet_id,
      business_name: business_name ?? '',
      outlet_name: outlet_name ?? '',
      address: address ?? '',
      phone: phone ?? '',
      currency: currency ?? 'IDR',
      fee_shopeefood: fee_shopeefood ?? null,
      fee_gofood: fee_gofood ?? null,
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