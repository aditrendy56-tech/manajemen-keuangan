export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { deleteCashTransactionsBySource } from '@/lib/cash/ledger';
import { revertSalesSplit } from '@/lib/cash/dual-bucket-v2';

export async function DELETE(request: NextRequest) {
  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[DELETE /api/sale-items] Request body parse failed:', parseError?.message || parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const itemIds: string[] = Array.isArray(body?.item_ids)
      ? body.item_ids.filter((id: any) => typeof id === 'string')
      : [];

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'item_ids required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: items, error: fetchError } = await supabase
      .from('sale_items')
      .select('id, sale_id, quantity, unit_price, cost_price')
      .in('id', itemIds);

    if (fetchError) {
      console.error('[DELETE /api/sale-items] Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No sale items found' }, { status: 404 });
    }

    const saleIds = Array.from(new Set(items.map((item: any) => item.sale_id).filter(Boolean)));

    const { error: deleteError } = await supabase
      .from('sale_items')
      .delete()
      .in('id', itemIds);

    if (deleteError) {
      console.error('[DELETE /api/sale-items] Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    for (const saleId of saleIds) {
      const { data: remainingItems, error: remainingError } = await supabase
        .from('sale_items')
        .select('id')
        .eq('sale_id', saleId)
        .limit(1);

      if (remainingError) {
        console.warn('[DELETE /api/sale-items] Warning: failed to check remaining sale_items for sale', saleId, remainingError.message);
        continue;
      }

      if (!remainingItems || remainingItems.length === 0) {
        const { error: deleteProfitError } = await supabase
          .from('profit_pending_transactions')
          .delete()
          .eq('sale_id', saleId);

        if (deleteProfitError) {
          console.warn('[DELETE /api/sale-items] Warning: Failed to delete profit_pending_transactions for sale', saleId, deleteProfitError.message);
        }

        const { error: deleteSaleError } = await supabase
          .from('sales')
          .delete()
          .eq('id', saleId);

        if (deleteSaleError) {
          console.warn('[DELETE /api/sale-items] Warning: Failed to delete sale', saleId, deleteSaleError.message);
        } else {
          try {
            await deleteCashTransactionsBySource('sale', saleId);
          } catch (e: any) {
            console.warn('[DELETE /api/sale-items] Warning: Failed to delete cash_transactions for sale', saleId, e?.message || e);
          }
        }
      }
    }

    return NextResponse.json({ success: true, deleted_item_ids: itemIds, affected_sales: saleIds }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE /api/sale-items] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
