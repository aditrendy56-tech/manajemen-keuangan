import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const supplierId = searchParams.get('supplier_id');

    let query = supabase
      .from('material_purchases')
      .select(`
        *,
        raw_materials:raw_material_id (id, name, unit),
        suppliers:supplier_id (id, name)
      `);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();

    const {
      outlet_id,
      raw_material_id,
      supplier_id,
      date,
      quantity,
      unit_price,
      total_amount,
      quality,
      invoice_number,
      payment_status,
      delivery_date,
      notes,
    } = body;

    if (!outlet_id || !raw_material_id || !supplier_id || !quantity || !unit_price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('material_purchases')
      .insert([
        {
          outlet_id,
          raw_material_id,
          supplier_id,
          date,
          quantity,
          unit_price,
          total_amount,
          quality,
          invoice_number,
          payment_status,
          delivery_date,
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase' },
      { status: 500 }
    );
  }
}
