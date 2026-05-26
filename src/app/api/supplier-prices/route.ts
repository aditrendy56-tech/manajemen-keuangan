import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const materialId = searchParams.get('material_id');
    const supplierId = searchParams.get('supplier_id');

    let query = supabase
      .from('supplier_prices')
      .select(`
        *,
        suppliers:supplier_id (id, name, phone, address, quality_rating),
        raw_materials:raw_material_id (id, name, unit)
      `)
      .eq('is_current', true);

    if (materialId) {
      query = query.eq('raw_material_id', materialId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query.order('unit_price', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching supplier prices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch supplier prices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();

    const {
      supplier_id,
      raw_material_id,
      unit_price,
      minimum_order,
      notes,
    } = body;

    if (!supplier_id || !raw_material_id || unit_price === undefined) {
      return NextResponse.json(
        { error: 'supplier_id, raw_material_id, and unit_price are required' },
        { status: 400 }
      );
    }

    // Set all previous prices as not current
    await supabase
      .from('supplier_prices')
      .update({ is_current: false })
      .eq('supplier_id', supplier_id)
      .eq('raw_material_id', raw_material_id);

    const { data, error } = await supabase
      .from('supplier_prices')
      .insert([
        {
          supplier_id,
          raw_material_id,
          unit_price,
          minimum_order,
          is_current: true,
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier price:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create supplier price' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('supplier_prices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating supplier price:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update supplier price' },
      { status: 500 }
    );
  }
}
