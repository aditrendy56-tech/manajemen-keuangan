import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');

    if (!outletId) {
      return NextResponse.json(
        { error: 'outlet_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching suppliers:', error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch suppliers',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
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
      name,
      contact_person,
      phone,
      whatsapp,
      address,
      opening_hours,
      quality_rating,
      reliability,
      notes,
    } = body;

    if (!outlet_id || !name) {
      return NextResponse.json(
        { error: 'outlet_id and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([
        {
          outlet_id,
          name,
          contact_person,
          phone,
          whatsapp,
          address,
          opening_hours,
          quality_rating,
          reliability,
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create supplier' },
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
      .from('suppliers')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update supplier' },
      { status: 500 }
    );
  }
}
