export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteCashTransactionsBySource } from '@/lib/cash/ledger';
import { recordCashTransaction } from '@/lib/cash/ledger';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Delete sale items first
    const { error: itemsError } = await getSupabaseServer()
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (itemsError) throw itemsError;

    // Delete sale
    const { error: saleError } = await getSupabaseServer()
      .from('sales')
      .delete()
      .eq('id', id);

    if (saleError) throw saleError;

    await deleteCashTransactionsBySource('sale', id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
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

    const supabase = getSupabaseServer();
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
