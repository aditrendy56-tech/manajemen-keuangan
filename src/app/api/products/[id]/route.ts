export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js compatibility)
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    
    console.log('PUT /api/products/[id] - id:', id);
    
    if (!id) {
      console.error('No id provided in params');
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const body = await request.json();
    console.log('PUT /api/products/[id] - body:', JSON.stringify(body));

    // Only include fields that were explicitly provided and not null
    const updateData: any = {};
    if (body.name !== undefined && body.name !== null) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.cost_price !== undefined && body.cost_price !== null) updateData.cost_price = body.cost_price;
    if (body.price !== undefined && body.price !== null && body.price > 0) updateData.price = body.price;
    if (body.price_offline !== undefined && body.price_offline !== null && body.price_offline > 0) updateData.price_offline = body.price_offline;
    if (body.price_shopeefood !== undefined && body.price_shopeefood !== null && body.price_shopeefood > 0) updateData.price_shopeefood = body.price_shopeefood;
    if (body.price_gofood !== undefined && body.price_gofood !== null && body.price_gofood > 0) updateData.price_gofood = body.price_gofood;
    
    // If no fields were provided, reject the request
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    console.log('PUT /api/products/[id] - updateData:', JSON.stringify(updateData));

    const { data, error } = await (getSupabaseServer().from('products') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('PUT /api/products/[id] - success, updated data:', JSON.stringify(data));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const body = await request.json();

    // Filter out null and undefined price values
    const filteredBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      // Skip null/undefined, but allow 0 for cost_price
      if (value !== null && value !== undefined) {
        // For price fields, ensure they are > 0
        if ((key === 'price' || key === 'price_offline' || key === 'price_shopeefood' || key === 'price_gofood') && typeof value === 'number' && value <= 0) {
          continue; // Skip price values that are <= 0
        }
        filteredBody[key] = value;
      }
    }

    if (Object.keys(filteredBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await (getSupabaseServer().from('products') as any)
      .update(filteredBody)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    const { error } = await getSupabaseServer()
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
