export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteCashTransactionsBySource } from '@/lib/cash/ledger';
import { revertSalesSplit } from '@/lib/cash/dual-bucket-v2';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: saleToDelete, error: fetchSaleError } = await supabase
      .from('sales')
      .select('id, outlet_id, gross_amount, platform_fee')
      .eq('id', id)
      .single();

    if (fetchSaleError || !saleToDelete) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    try {
      await revertSalesSplit(
        saleToDelete.outlet_id,
        saleToDelete.id,
        Number(saleToDelete.gross_amount || 0),
        Number(saleToDelete.platform_fee || 0)
      );
    } catch (rollbackError) {
      console.warn('[DELETE /api/sales] Warning: rollback split failed, continuing cleanup:', rollbackError);
    }

    // Delete profit_pending_transactions associated with this sale
    const { error: deleteProfitError } = await supabase
      .from('profit_pending_transactions')
      .delete()
      .eq('sale_id', id);

    if (deleteProfitError) {
      console.warn('[DELETE /api/sales] Warning: Failed to delete profit_pending_transactions:', deleteProfitError.message);
      // Continue anyway - not critical
    }

    // Delete sale items
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (itemsError) throw itemsError;

    // Delete sale
    const { error: saleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (saleError) throw saleError;

    await deleteCashTransactionsBySource('sale', id);

    console.log('[DELETE /api/sales] Successfully deleted sale:', id);
    return NextResponse.json({ success: true, message: 'Sale deleted successfully', sale_id: id }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE /api/sales] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      payment_status,
      settlement_date,
      payment_reference,
      notes,
      refund_amount,
      refund_reason,
      refunded_at,
      refund_reference,
      platform_fee,
      edit_reason,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: existing, error: fetchError } = await supabase.from('sales').select('*').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    const originalAmount = Number(existing.net_amount || existing.gross_amount || 0);
    const requestedRefundAmount = Number(refund_amount ?? existing.refund_amount ?? 0);
    const requestedStatus = String(payment_status || existing.payment_status || '').toLowerCase();

    if (requestedStatus === 'refunded' && requestedRefundAmount <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than 0' }, { status: 400 });
    }

    if (requestedStatus === 'refunded' && requestedRefundAmount > originalAmount) {
      return NextResponse.json({ error: 'Refund amount cannot exceed original amount' }, { status: 400 });
    }

    const baseUpdateData: Record<string, any> = {
      payment_status: payment_status || existing.payment_status,
      settlement_date: settlement_date || existing.settlement_date || null,
      payment_reference: payment_reference ?? existing.payment_reference ?? null,
      notes: notes ?? existing.notes ?? null,
    };

    // PATCH Update: Handle platform_fee update
    if (platform_fee !== undefined && platform_fee !== null) {
      baseUpdateData.platform_fee = Number(platform_fee);
    }

    const refundUpdateData = {
      ...baseUpdateData,
      refund_amount: refund_amount ?? existing.refund_amount ?? null,
      refund_reason: refund_reason ?? existing.refund_reason ?? null,
      refunded_at: refunded_at ?? existing.refunded_at ?? null,
      refund_reference: refund_reference ?? existing.refund_reference ?? null,
    };

    const updatePayload: Record<string, any> = requestedStatus === 'refunded'
      ? refundUpdateData
      : baseUpdateData;
    let updated;
    let updateError;

    ({ data: updated, error: updateError } = await supabase
      .from('sales')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single());

    if (updateError && requestedStatus === 'refunded' && String(updateError.message || '').includes('refund_amount')) {
      ({ data: updated, error: updateError } = await supabase
        .from('sales')
        .update(baseUpdateData)
        .eq('id', id)
        .select()
        .single());
    }

    if (updateError) throw updateError;

    // PATCH Update: Log fee edit to audit trail (if table exists)
    if (platform_fee !== undefined && platform_fee !== null) {
      const old_fee = existing.platform_fee || 0;
      const new_fee = platform_fee;
      try {
        await supabase.from('sales_fee_edits').insert([
          {
            sale_id: id,
            old_fee,
            new_fee,
            reason: edit_reason || 'Manual adjustment',
            edited_at: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        // Silently fail if audit table doesn't exist
        console.log('Audit table not available, skipping audit log');
      }
    }

    const isRefunded = String(updatePayload.payment_status || '').toLowerCase() === 'refunded';
    if (isRefunded) {
      const effectiveRefundAmount = Number(refund_amount ?? existing.net_amount ?? existing.gross_amount ?? 0);
      const refundKey = refund_reference || `${id}-refund`;
      const { data: existingRefundCash } = await supabase
        .from('cash_transactions')
        .select('id')
        .eq('source_type', 'sale_refund')
        .eq('source_id', id)
        .eq('notes', refundKey)
        .maybeSingle();

      if (!existingRefundCash?.id) {
        await recordCashTransaction({
          outlet_id: updated.outlet_id,
          transaction_date: (refunded_at as string | undefined)?.split?.('T')?.[0] || settlement_date || new Date().toISOString().split('T')[0],
          transaction_type: 'inflow',
          source_type: 'sale_refund',
          source_id: id,
          amount: effectiveRefundAmount,
          description: `Refund penjualan ${updated.platform || updated.channel}`,
          notes: refundKey,
        });
      }
    }

    const shouldRecordCash = String(updatePayload.payment_status || '').toLowerCase() === 'settled';
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
