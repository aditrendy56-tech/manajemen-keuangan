export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionForTransaction } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[POST /api/sales/custom] Request body:', body);
    
    const {
      session_id,
      outlet_id,
      product_id,
      quantity,
      custom_price,
      custom_description,
    } = body;

    // Validasi required fields
    if (!outlet_id || !product_id || !quantity || !custom_price || !custom_description) {
      return NextResponse.json(
        {
          error: 'Missing required fields: session_id, outlet_id, product_id, quantity, custom_price, custom_description',
        },
        { status: 400 }
      );
    }

    // Resolve session
    const session = await resolveSessionForTransaction({
      sessionId: session_id,
      outletId: outlet_id,
      autoCreate: false, // Require explicit session creation
    });

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Session belum tersedia. Buka sesi harian terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Fetch product to get original price
    const { data: product, error: productError } = await getSupabaseServer()
      .from('products')
      .select('id, name, price_offline')
      .eq('id', product_id)
      .eq('outlet_id', outlet_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan atau tidak valid untuk outlet ini' },
        { status: 400 }
      );
    }

    // Calculate original price (reference price for this quantity)
    const originalPrice = product.price_offline || 0;
    const customOriginalPrice = originalPrice * quantity;
    const customFinalPrice = Number(custom_price);

    // Validasi: custom price harus <= original price
    if (customFinalPrice > customOriginalPrice) {
      return NextResponse.json(
        {
          error: 'Harga custom tidak boleh lebih besar dari harga normal',
          details: {
            original_total: customOriginalPrice,
            custom_price: customFinalPrice,
          },
        },
        { status: 400 }
      );
    }

    // Create sale record for custom pricing
    const saleData = {
      session_id: session.id,
      outlet_id,
      product_id,
      quantity: Number(quantity),
      channel: 'offline',
      channel_type: 'offline',
      platform: null,
      payment_method: 'cash',
      type: 'custom',
      is_custom_price: true,
      custom_original_price: customOriginalPrice,
      custom_final_price: customFinalPrice,
      custom_description: custom_description.trim(),
      gross_amount: customFinalPrice,
      platform_fee: 0,
      net_amount: customFinalPrice,
      payment_status: 'settled',
      settlement_date: new Date().toISOString().split('T')[0],
      payment_entries: [
        {
          payment_method: 'cash',
          amount: customFinalPrice,
          payment_status: 'settled',
          settlement_date: new Date().toISOString().split('T')[0],
          payment_reference: null,
          notes: `Custom pricing: ${custom_description}`,
        },
      ],
      notes: `Custom Pricing - ${custom_description}`,
    };

    console.log('[POST /api/sales/custom] Insert data:', saleData);

    const { data: sale, error: saleError } = await getSupabaseServer()
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    if (saleError) {
      console.error('[POST /api/sales/custom] Error inserting sale:', saleError);
      throw saleError;
    }

    // Calculate discount
    const discountAmount = customOriginalPrice - customFinalPrice;
    const discountPercentage = customOriginalPrice > 0 
      ? ((discountAmount / customOriginalPrice) * 100).toFixed(2)
      : '0';

    return NextResponse.json(
      {
        success: true,
        message: 'Custom pricing berhasil ditambahkan',
        data: {
          id: sale.id,
          product_name: product.name,
          quantity,
          original_price: originalPrice,
          original_total: customOriginalPrice,
          custom_price: customFinalPrice,
          discount_amount: discountAmount,
          discount_percentage: `${discountPercentage}%`,
          description: custom_description,
          created_at: sale.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/sales/custom] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat custom pricing' },
      { status: 500 }
    );
  }
}
