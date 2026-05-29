export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculatePlatformFee } from '@/lib/calculations/platform-fees';
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

    let query = getSupabaseServer().from('sales').select('*').eq('outlet_id', outletId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query
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
    const {
      session_id,
      outlet_id,
      channel,
      channel_type,
      platform,
      payment_method,
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

    const platform_fee = calculatePlatformFee(normalizedPlatform || normalizedChannelType, gross_amount);
    const net_amount = gross_amount - platform_fee;

    const saleInsertData = {
      session_id: session.id,
      outlet_id,
      channel: legacyChannel,
      channel_type: normalizedChannelType,
      platform: normalizedPlatform,
      payment_method,
      gross_amount,
      platform_fee,
      net_amount,
      payment_status: payment_status || (payment_method === 'cash' ? 'settled' : 'pending'),
      settlement_date: settlement_date || null,
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

    if (String(saleData.payment_status || '').toLowerCase() === 'settled') {
      await recordCashTransaction({
        outlet_id,
        transaction_date:
          (saleData.settlement_date as string | null) || session.date || new Date().toISOString().split('T')[0],
        transaction_type: 'inflow',
        source_type: 'sale',
        source_id: saleId,
        amount: Number(net_amount),
        description: `Penjualan ${normalizedPlatform || normalizedChannelType}`,
        notes: notes || null,
      });
    }

    return NextResponse.json(saleData, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/sales] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payment_status, settlement_date, payment_reference, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();
    const { data: existing, error: fetchError } = await supabase.from('sales').select('*').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    const updateData = {
      payment_status: payment_status || existing.payment_status,
      settlement_date: settlement_date || existing.settlement_date || null,
      payment_reference: payment_reference ?? existing.payment_reference ?? null,
      notes: notes ?? existing.notes ?? null,
    };

    const { data: updated, error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const shouldRecordCash = String(updateData.payment_status || '').toLowerCase() === 'settled';
    if (shouldRecordCash) {
      const { data: existingCash } = await supabase
        .from('cash_transactions')
        .select('id')
        .eq('source_type', 'sale')
        .eq('source_id', id)
        .maybeSingle();

      if (!existingCash?.id) {
        await recordCashTransaction({
          outlet_id: updated.outlet_id,
          transaction_date: (updated.settlement_date as string | null) || updated.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          transaction_type: 'inflow',
          source_type: 'sale',
          source_id: id,
          amount: Number(updated.net_amount || 0),
          description: `Settlement penjualan ${updated.platform || updated.channel}`,
          notes: updated.notes || null,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
