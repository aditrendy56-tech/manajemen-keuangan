export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculatePlatformFee, calculatePlatformFeeServer, calculateSaleAnalysis } from '@/lib/calculations/platform-fees';
import { recordCashTransaction } from '@/lib/cash/ledger';
import { splitSalesTransaction } from '@/lib/cash/dual-bucket-v2';
import { resolveSessionForTransaction } from '@/lib/sessions';

function stripFields(payload: Record<string, any>, fieldsToRemove: string[]) {
  const nextPayload = { ...payload };
  fieldsToRemove.forEach((field) => delete nextPayload[field]);
  return nextPayload;
}

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

    // Get sales with joined sale_items for full transaction details.
    let query = supabase
      .from('sales')
      .select(
        `
        *,
        sale_items (id, product_id, quantity, unit_price, subtotal)
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

    // Enrich sales data with product names and full item details.
    const enrichedData = salesWithItems.map((sale: any) => {
      const saleItems = Array.isArray(sale.sale_items)
        ? sale.sale_items.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: productMap.get(item.product_id) || 'Item',
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            subtotal: Number(item.subtotal || (Number(item.quantity || 0) * Number(item.unit_price || 0)) || 0),
          }))
        : [];

      const product_name = saleItems[0]?.product_name || (sale.product_id ? productMap.get(sale.product_id) || null : null);

      return {
        ...sale,
        sale_items: saleItems,
        item_count: saleItems.length,
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
      net_revenue,
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
      autoCreate: false, // Require explicit session creation
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

    const itemTotal = Array.isArray(items)
      ? items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0)
      : 0;

    const effectiveGrossAmount = Number(gross_amount || itemTotal || 0);
    const splitAmount = normalizedEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);

    if (normalizedEntries.length > 0 && Math.abs(splitAmount - effectiveGrossAmount) > 0.01) {
      return NextResponse.json(
        { error: 'Jumlah payment_entries harus sama dengan gross_amount' },
        { status: 400 }
      );
    }

    if (String(payment_method || '').toLowerCase() === 'split' && normalizedEntries.length < 2) {
      return NextResponse.json({ error: 'Split payment membutuhkan minimal 2 payment_entries' }, { status: 400 });
    }

    const isOnlineChannel = normalizedChannelType === 'online' || ['shopeefood', 'gofood'].includes(String(normalizedPlatform || ''));
    const rawNetRevenue = Number(net_revenue ?? 0);

    const { calculated_total, net_revenue: realNetRevenue, fee_amount, fee_percentage } = calculateSaleAnalysis(
      effectiveGrossAmount,
      isOnlineChannel ? rawNetRevenue : effectiveGrossAmount,
    );

    const platform_fee = isOnlineChannel && rawNetRevenue > 0
      ? fee_amount
      : await calculatePlatformFeeServer(normalizedPlatform || normalizedChannelType, effectiveGrossAmount, outlet_id);
    const net_amount = isOnlineChannel && rawNetRevenue > 0
      ? realNetRevenue
      : effectiveGrossAmount - platform_fee;

    const inferredPaymentMethod =
      payment_method || (normalizedEntries.length > 1 ? 'split' : normalizedEntries[0]?.payment_method || 'cash');
    const overallPaymentStatus = normalizedEntries.length > 0
      ? (normalizedEntries.every((entry: any) => String(entry.payment_status || '').toLowerCase() === 'settled') ? 'settled' : 'pending')
      : (payment_status || (inferredPaymentMethod === 'cash' ? 'settled' : 'pending'));

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
      gross_amount: calculated_total,
      calculated_total,
      fee_amount,
      fee_percentage,
      platform_fee,
      net_amount,
      payment_status: overallPaymentStatus,
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

    const fallbackWithoutFeeColumns = stripFields(saleInsertData, ['calculated_total', 'fee_amount', 'fee_percentage']);
    const fallbackWithoutPaymentEntries = stripFields(saleInsertData, ['payment_entries']);
    const fallbackWithoutChannelColumns = stripFields(saleInsertData, ['channel_type', 'platform', 'payment_status', 'settlement_date', 'payment_reference']);
    const legacyFallbackPayload = stripFields(
      saleInsertData,
      ['calculated_total', 'fee_amount', 'fee_percentage', 'payment_entries', 'channel_type', 'platform', 'payment_status', 'settlement_date', 'payment_reference']
    );

    if (saleError) {
      const errorText = String(saleError.message || '').toLowerCase();
      const fallbackStrategies = [
        {
          shouldTry: /calculated_total|fee_amount|fee_percentage/.test(errorText),
          label: 'Online fee analysis columns',
          payload: fallbackWithoutFeeColumns,
        },
        {
          shouldTry: /payment_entries/.test(errorText),
          label: 'payment_entries column',
          payload: fallbackWithoutPaymentEntries,
        },
        {
          shouldTry: /channel_type|platform|payment_status|settlement_date|payment_reference/.test(errorText),
          label: 'channel/payment metadata columns',
          payload: fallbackWithoutChannelColumns,
        },
        {
          shouldTry: /calculated_total|fee_amount|fee_percentage|payment_entries|channel_type|platform|payment_status|settlement_date|payment_reference/.test(errorText),
          label: 'Legacy schema fallback payload',
          payload: legacyFallbackPayload,
        },
      ].filter((strategy, index, array) => strategy.shouldTry && array.findIndex((candidate) => candidate.label === strategy.label) === index);

      for (const strategy of fallbackStrategies) {
        console.warn(`[POST /api/sales] Fallback: ${strategy.label} may not exist, retrying without them...`, saleError.message);
        saleResult = await (getSupabaseServer().from('sales') as any)
          .insert([strategy.payload])
          .select()
          .single();
        ({ data: saleData, error: saleError } = saleResult);

        if (!saleError) {
          break;
        }
      }
    }

    console.log('[POST /api/sales] Response:', { data: saleData, error: saleError });
    if (saleError) throw saleError;

    const saleId = saleData.id;

    // ===== NEW: Auto-split sales between Kas Utama (60%) and Profit Pending (40%) =====
    try {
      await splitSalesTransaction(
        outlet_id,
        saleId,
        effectiveGrossAmount,
        platform_fee
      );
      console.log('[POST /api/sales] Auto-split completed for sale:', saleId);
    } catch (splitError) {
      console.error('[POST /api/sales] Warning: Auto-split failed:', splitError);
      // Don't throw - sale is created, split failure is non-critical
    }
    // ===== END: Auto-split =====

    // Insert sale items with HPP calculation
    let totalGrossProfit = 0;
    if (items && items.length > 0) {
      // Fetch cost_price for all products
      const productIds = items.map((item: any) => item.product_id).filter(Boolean);
      const costPriceMap = new Map<string, number>();
      
      if (productIds.length > 0) {
        const { data: products } = await getSupabaseServer()
          .from('products')
          .select('id, cost_price')
          .in('id', productIds);
        
        products?.forEach((p: any) => {
          costPriceMap.set(p.id, p.cost_price || 0);
        });
      }

      const saleItems = items.map((item: any) => {
        const costPrice = costPriceMap.get(item.product_id) || 0;
        const hppAmount = item.quantity * costPrice;
        const lineProfit = (item.quantity * item.unit_price) - hppAmount;
        totalGrossProfit += lineProfit;

        return {
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          cost_price: costPrice,
          // NOTE: hpp_amount, gross_profit, profit_margin_percent are GENERATED ALWAYS columns
          // They are automatically calculated by the database, so we don't insert them
        };
      });

      const { error: itemsError } = await (getSupabaseServer().from('sale_items') as any).insert(saleItems);
      if (itemsError) throw itemsError;

      // Update sale with gross_profit
      const { error: updateError } = await getSupabaseServer()
        .from('sales')
        .update({ gross_profit: totalGrossProfit })
        .eq('id', saleId);
      
      if (updateError) throw updateError;
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
