export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionForTransaction } from '@/lib/sessions';

function stripFields(payload: Record<string, any>, fieldsToRemove: string[]) {
  const nextPayload = { ...payload };
  fieldsToRemove.forEach((field) => delete nextPayload[field]);
  return nextPayload;
}

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

    let saleResult = await getSupabaseServer()
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    let { data: sale, error: saleError } = saleResult;

    if (saleError) {
      const errorText = String(saleError.message || '').toLowerCase();
      const fallbackStrategies = [
        {
          shouldTry: /payment_entries/.test(errorText),
          label: 'payment_entries column',
          payload: stripFields(saleData, ['payment_entries']),
        },
        {
          shouldTry: /custom_original_price|custom_final_price|custom_description|is_custom_price/.test(errorText),
          label: 'custom pricing columns',
          payload: stripFields(saleData, ['custom_original_price', 'custom_final_price', 'custom_description', 'is_custom_price']),
        },
        {
          shouldTry: /channel_type|platform|payment_status|settlement_date|payment_reference/.test(errorText),
          label: 'channel/payment metadata columns',
          payload: stripFields(saleData, ['channel_type', 'platform', 'payment_status', 'settlement_date', 'payment_reference']),
        },
        {
          shouldTry: /payment_entries|custom_original_price|custom_final_price|custom_description|is_custom_price|channel_type|platform|payment_status|settlement_date|payment_reference/.test(errorText),
          label: 'minimal legacy payload',
          payload: stripFields(
            saleData,
            ['payment_entries', 'custom_original_price', 'custom_final_price', 'custom_description', 'is_custom_price', 'channel_type', 'platform', 'payment_status', 'settlement_date', 'payment_reference']
          ),
        },
      ].filter((strategy, index, array) => strategy.shouldTry && array.findIndex((candidate) => candidate.label === strategy.label) === index);

      for (const strategy of fallbackStrategies) {
        console.warn(`[POST /api/sales/custom] Fallback: ${strategy.label} may not exist, retrying without them...`, saleError.message);
        saleResult = await getSupabaseServer()
          .from('sales')
          .insert([strategy.payload])
          .select()
          .single();
        ({ data: sale, error: saleError } = saleResult);

        if (!saleError) {
          break;
        }
      }
    }

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
