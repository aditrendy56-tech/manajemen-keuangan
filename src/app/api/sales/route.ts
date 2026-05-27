export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculatePlatformFee } from '@/lib/calculations/platform-fees';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false })
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
    console.log('[POST /api/sales] Request body:', body);
    const { session_id, outlet_id, channel, payment_method, gross_amount, items } = body;

    if (!session_id || !outlet_id || !channel || !payment_method || !gross_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const platform_fee = calculatePlatformFee(channel as any, gross_amount);
    const net_amount = gross_amount - platform_fee;

    const saleInsertData = {
      session_id,
      outlet_id,
      channel,
      payment_method,
      gross_amount,
      platform_fee,
      net_amount,
    };
    console.log('[POST /api/sales] Insert data:', saleInsertData);
    const { data: saleData, error: saleError } = await (getSupabaseServer().from('sales') as any)
      .insert([saleInsertData])
      .select()
      .single();

    console.log('[POST /api/sales] Response:', { data: saleData, error: saleError });
    if (saleError) throw saleError;

    const saleId = saleData.id;

    // Insert sale items
    if (items && items.length > 0) {
      const saleItems = items.map((item: any) => ({
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await (getSupabaseServer().from('sale_items') as any).insert(saleItems);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json(saleData, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/sales] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
