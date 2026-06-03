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

    const { error } = await getSupabaseServer()
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await deleteCashTransactionsBySource('expense', id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
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
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const expensesTable: any = supabase.from('expenses');
    const cashTransactionsTable: any = supabase.from('cash_transactions');

    const { data: existing, error: fetchError } = await expensesTable.select('*').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    const expenseRow: any = existing;
    if (!expenseRow) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    const originalAmount = Number(expenseRow.amount || 0);
    const requestedRefundAmount = Number(refund_amount ?? expenseRow.refund_amount ?? 0);
    const requestedStatus = String(payment_status || expenseRow.payment_status || '').toLowerCase();

    if (requestedStatus === 'refunded' && requestedRefundAmount <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than 0' }, { status: 400 });
    }

    if (requestedStatus === 'refunded' && requestedRefundAmount > originalAmount) {
      return NextResponse.json({ error: 'Refund amount cannot exceed original amount' }, { status: 400 });
    }

    const baseUpdateData = {
      payment_status: payment_status || expenseRow.payment_status,
      settlement_date: settlement_date || expenseRow.settlement_date || null,
      payment_reference: payment_reference ?? expenseRow.payment_reference ?? null,
      notes: notes ?? expenseRow.notes ?? null,
    };

    const refundUpdateData = {
      ...baseUpdateData,
      refund_amount: refund_amount ?? expenseRow.refund_amount ?? null,
      refund_reason: refund_reason ?? expenseRow.refund_reason ?? null,
      refunded_at: refunded_at ?? expenseRow.refunded_at ?? null,
      refund_reference: refund_reference ?? expenseRow.refund_reference ?? null,
    };

    const updatePayload = requestedStatus === 'refunded' ? refundUpdateData : baseUpdateData;
    let updated;
    let updateError;

    ({ data: updated, error: updateError } = await expensesTable.update(updatePayload).eq('id', id).select().single());

    if (updateError && requestedStatus === 'refunded' && String(updateError.message || '').includes('refund_amount')) {
      ({ data: updated, error: updateError } = await expensesTable.update(baseUpdateData).eq('id', id).select().single());
    }

    if (updateError) throw updateError;
    const updatedExpense: any = updated;

    const isRefunded = String(updatePayload.payment_status || '').toLowerCase() === 'refunded';
    if (isRefunded) {
      const effectiveRefundAmount = Number(refund_amount ?? expenseRow.amount ?? 0);
      const refundKey = refund_reference || `${id}-refund`;
      const { data: existingRefundCash } = await cashTransactionsTable
        .select('id')
        .eq('source_type', 'expense_refund')
        .eq('source_id', id)
        .eq('notes', refundKey)
        .maybeSingle();

      if (!existingRefundCash?.id) {
        await recordCashTransaction({
          outlet_id: updatedExpense.outlet_id,
          transaction_date: (refunded_at as string | undefined)?.split?.('T')?.[0] || settlement_date || new Date().toISOString().split('T')[0],
          transaction_type: 'inflow',
          source_type: 'expense_refund',
          source_id: id,
          amount: effectiveRefundAmount,
          description: `Refund pengeluaran ${updatedExpense.description}`,
          notes: refundKey,
        });
      }
    }

    const shouldRecordCash = String(updatePayload.payment_status || '').toLowerCase() === 'paid';
    if (shouldRecordCash) {
      const { data: existingCash } = await cashTransactionsTable.select('id').eq('source_type', 'expense').eq('source_id', id).maybeSingle();

      if (!existingCash?.id) {
        await recordCashTransaction({
          outlet_id: updatedExpense.outlet_id,
          transaction_date: (updatedExpense.settlement_date as string | null) || updatedExpense.date || new Date().toISOString().split('T')[0],
          transaction_type: 'outflow',
          source_type: 'expense',
          source_id: id,
          amount: Number(updatedExpense.amount || 0),
          description: updatedExpense.description,
          notes: updatedExpense.notes || null,
        });
      }
    }

    return NextResponse.json(updatedExpense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
