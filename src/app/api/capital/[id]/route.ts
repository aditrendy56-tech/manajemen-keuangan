export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteCashTransactionsBySource, recordCashTransaction } from '@/lib/cash/ledger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, amount, source, notes, edit_reason } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Get current entry to save as original
    const { data: currentEntry, error: fetchError } = await getSupabaseServer()
      .from('capital_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!currentEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Prepare update data with audit trail
    const updateData: any = {
      edited_at: new Date().toISOString(),
      edit_reason: edit_reason || null,
    };

    // Only save original values if they're being changed
    if (date && date !== currentEntry.date) {
      updateData.original_date = currentEntry.date;
    }
    if (amount && parseFloat(amount) !== parseFloat(currentEntry.amount)) {
      updateData.original_amount = currentEntry.amount;
    }
    if (notes !== undefined && notes !== currentEntry.notes) {
      updateData.original_notes = currentEntry.notes;
    }
    if (source && source !== currentEntry.source) {
      updateData.original_source = currentEntry.source;
    }

    // Update with new values
    if (date) updateData.date = date;
    if (amount) updateData.amount = amount;
    if (source !== undefined) updateData.source = source;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await (getSupabaseServer().from('capital_entries') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update cash transaction if amount changed
    if (amount && parseFloat(amount) !== parseFloat(currentEntry.amount)) {
      const amountDifference = parseFloat(amount) - parseFloat(currentEntry.amount);
      
      // Delete old transaction and create new one
      await deleteCashTransactionsBySource('capital_entry', id);
      
      await recordCashTransaction({
        outlet_id: currentEntry.outlet_id,
        transaction_date: date || currentEntry.date,
        transaction_type: 'inflow',
        source_type: 'capital_entry',
        source_id: id,
        amount: Number(amount),
        description: `Modal masuk${source ? ` - ${source}` : ''} (Edit)`,
        notes: (notes || currentEntry.notes || '') + (edit_reason ? ` [Edit reason: ${edit_reason}]` : ''),
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await getSupabaseServer().from('capital_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await deleteCashTransactionsBySource('capital_entry', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
