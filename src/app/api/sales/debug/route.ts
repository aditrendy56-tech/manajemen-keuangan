import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Check what sales exist in the database
 * GET /api/sales/debug?outlet_id=xxx&session_id=yyy
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const sessionId = searchParams.get('session_id');
    const saleId = searchParams.get('sale_id');

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // If specific sale_id is provided, check that one
    if (saleId) {
      const { data: sale, error } = await supabase
        .from('sales')
        .select('id, session_id, outlet_id, gross_amount, net_amount, payment_status, created_at, payment_method, channel')
        .eq('id', saleId)
        .single();

      if (error) {
        return NextResponse.json({
          found: false,
          sale_id: saleId,
          error: error.message,
        });
      }

      return NextResponse.json({
        found: !!sale,
        sale: sale || null,
      });
    }

    // Otherwise list all sales for outlet/session
    let query = supabase
      .from('sales')
      .select('id, session_id, outlet_id, gross_amount, net_amount, payment_status, created_at, payment_method, channel')
      .eq('outlet_id', outletId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: sales, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      outlet_id: outletId,
      session_id: sessionId || 'all',
      count: sales?.length || 0,
      sales: sales || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
