import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');

    let query = supabase.from('raw_materials').select('*');

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching raw materials:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch raw materials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();

    const { outlet_id, name, unit, price_per_unit } = body;

    if (!outlet_id || !name || !unit) {
      return NextResponse.json(
        { error: 'outlet_id, name, and unit are required' },
        { status: 400 }
      );
    }

    const insertData = {
      outlet_id,
      name,
      unit,
      price_per_unit: price_per_unit || 0,
    };

    const { data, error } = await (supabase
      .from('raw_materials') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating raw material:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create raw material' },
      { status: 500 }
    );
  }
}
