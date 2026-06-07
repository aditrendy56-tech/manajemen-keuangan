export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculatePlatformFee, calculatePlatformFeeServer } from '@/lib/calculations/platform-fees';
import { recordCashTransaction } from '@/lib/cash/ledger';
import { resolveSessionForTransaction } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const sessionId = searchParams.get('session_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Get sales with joined product info from sale_items
    let query = supabase
      .from('sales')
      .select(
        `
        *,
        sale_items (product_id)
      `
      )
      .eq('outlet_id', outletId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: salesWithItems, error } = await query
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    if (!salesWithItems || salesWithItems.length === 0) {
      return NextResponse.json([]);
    }

    // Collect all product IDs (from sale_items or custom pricing product_id)
    const productIds = new Set<string>();
    salesWithItems.forEach((sale: any) => {
      // From sale_items
      if (Array.isArray(sale.sale_items)) {
        sale.sale_items.forEach((item: any) => {
          if (item.product_id) productIds.add(item.product_id);
        });
      }
      // From custom pricing
      if (sale.product_id) productIds.add(sale.product_id);
    });

    // Fetch product names
    const productMap = new Map<string, string>();
    if (productIds.size > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', Array.from(productIds));

      products?.forEach((p: any) => {
        productMap.set(p.id, p.name);
      });
    }

    // Enrich sales data with product names
    const enrichedData = salesWithItems.map((sale: any) => {
      let product_name: string | null = null;

      // Priority 1: Custom pricing product_id
      if (sale.product_id) {
        product_name = productMap.get(sale.product_id) || null;
      }
      // Priority 2: First item from sale_items
      else if (Array.isArray(sale.sale_items) && sale.sale_items.length > 0) {
        const firstItem = sale.sale_items[0];
        if (firstItem.product_id) {
          product_name = productMap.get(firstItem.product_id) || null;
        }
      }

      // Remove sale_items from response (internal data)
      const { sale_items, ...saleData } = sale;

      return {
        ...saleData,
        product_name,
      };
    });

    return NextResponse.json(enrichedData);
  } catch (error: any) {
    console.error('[GET /api/sales] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[POST /api/sales] Request body:', body);
    const {
      session_id,
      outlet_id,
      channel,
      channel_type,
      platform,
      payment_method,
      payment_entries,
      gross_amount,
      items,
      payment_status,
      settlement_date,
      payment_reference,
      notes,
    } = body;

    const effectiveChannel =
      channel ||
      (channel_type === 'offline' ? 'offline' : platform || null);

    if (!outlet_id || !effectiveChannel || !payment_method || !gross_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const session = await resolveSessionForTransaction({
      sessionId: session_id,
      outletId: outlet_id,
    });

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Session belum tersedia. Buka sesi harian terlebih dahulu.' },
        { status: 400 }
      );
    }

    const normalizedChannelType =
      channel_type || (effectiveChannel === 'offline' ? 'offline' : 'online');
    const normalizedPlatform =
      platform || (effectiveChannel === 'shopeefood' || effectiveChannel === 'gofood' ? effectiveChannel : null);
    const legacyChannel =
      effectiveChannel === 'offline' ? 'offline' : normalizedPlatform || 'offline';

    const normalizedEntries = Array.isArray(payment_entries) ? payment_entries : [];
    if (String(payment_method || '').toLowerCase() === 'split' && normalizedEntries.length === 0) {
      return NextResponse.json({ error: 'Split payment membutuhkan payment_entries' }, { status: 400 });
    }
    const splitAmount = normalizedEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);
    const effectiveGrossAmount = Number(gross_amount || 0);

    if (normalizedEntries.length > 0 && Math.abs(splitAmount - effectiveGrossAmount) > 0.01) {
      return NextResponse.json(
        { error: 'Jumlah payment_entries harus sama dengan gross_amount' },
        { status: 400 }
      );
    }

    if (String(payment_method || '').toLowerCase() === 'split' && normalizedEntries.length < 2) {
      return NextResponse.json({ error: 'Split payment membutuhkan minimal 2 payment_entries' }, { status: 400 });
    }

    const platform_fee = await calculatePlatformFeeServer(normalizedPlatform || normalizedChannelType, effectiveGrossAmount, outlet_id);
    const net_amount = effectiveGrossAmount - platform_fee;

    const inferredPaymentMethod =
      payment_method || (normalizedEntries.length > 1 ? 'split' : normalizedEntries[0]?.payment_method || 'cash');
    const normalizedPaymentEntries =
      normalizedEntries.length > 0
        ? normalizedEntries.map((entry: any) => ({
            payment_method: entry.payment_method,
            amount: Number(entry.amount || 0),
            payment_status: entry.payment_status || (entry.payment_method === 'cash' ? 'settled' : 'pending'),
            settlement_date: entry.settlement_date || null,
            payment_reference: entry.payment_reference || null,
            notes: entry.notes || null,
          }))
        : [
            {
              payment_method: inferredPaymentMethod,
              amount: effectiveGrossAmount,
              payment_status: payment_status || (inferredPaymentMethod === 'cash' ? 'settled' : 'pending'),
              settlement_date: settlement_date || null,
              payment_reference: payment_reference || null,
              notes: notes || null,
            },
          ];

    const saleInsertData = {
      session_id: session.id,
      outlet_id,
      channel: legacyChannel,
      channel_type: normalizedChannelType,
      platform: normalizedPlatform,
      payment_method: inferredPaymentMethod,
      gross_amount: effectiveGrossAmount,
      platform_fee,
      net_amount,
      payment_status: payment_status || overallPaymentStatus,
      settlement_date: settlement_date || null,
      payment_entries: normalizedPaymentEntries,
      payment_reference: payment_reference || null,
      notes: notes || null,
    };
    console.log('[POST /api/sales] Insert data:', saleInsertData);
    let saleResult = await (getSupabaseServer().from('sales') as any)
      .insert([saleInsertData])
      .select()
      .single();

    let { data: saleData, error: saleError } = saleResult;

    if (saleError && String(saleError.message || '').toLowerCase().includes('channel_type')) {
      const { channel_type: _channelType, platform: _platform, payment_status: _paymentStatus, settlement_date: _settlementDate, payment_reference: _paymentReference, ...legacySaleInsertData } = saleInsertData as any;
      saleResult = await (getSupabaseServer().from('sales') as any)
        .insert([legacySaleInsertData])
        .select()
        .single();
      ({ data: saleData, error: saleError } = saleResult);
    }

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

    const settledEntries = normalizedPaymentEntries.filter((entry) => String(entry.payment_status || '').toLowerCase() === 'settled');
    if (settledEntries.length > 0) {
      for (const entry of settledEntries) {
        const { data: existingCash } = await (getSupabaseServer().from('cash_transactions') as any)
          .select('id')
          .eq('source_type', 'sale')
          .eq('source_id', saleId)
          .eq('notes', entry.payment_reference || entry.payment_method)
          .maybeSingle();

        if (!existingCash?.id) {
          await recordCashTransaction({
            outlet_id,
            transaction_date:
              entry.settlement_date || (saleData.settlement_date as string | null) || session.date || new Date().toISOString().split('T')[0],
            transaction_type: 'inflow',
            source_type: 'sale',
            source_id: saleId,
            amount: Number(entry.amount || 0),
            description: `Penjualan ${normalizedPlatform || normalizedChannelType} (${entry.payment_method})`,
            notes: entry.payment_reference || entry.notes || null,
          });
        }
      }
    }

    return NextResponse.json(saleData, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/sales] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
