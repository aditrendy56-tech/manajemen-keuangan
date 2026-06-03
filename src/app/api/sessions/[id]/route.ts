export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (status && !['open', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }
    }

    const { data, error } = await getSupabaseServer()
      .from('daily_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: session, error: sessionError } = await supabase
      .from('daily_sessions')
      .select('id, outlet_id, date')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const dayStart = `${session.date}T00:00:00`;
    const dayEnd = `${session.date}T23:59:59`;

    // Backward compatibility: some historical rows may not have session_id filled,
    // so we match by same outlet + same day and include session_id null.
    const { data: salesRows, error: salesQueryError } = await supabase
      .from('sales')
      .select('id')
      .eq('outlet_id', session.outlet_id)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .or(`session_id.eq.${sessionId},session_id.is.null`);
    if (salesQueryError) throw salesQueryError;

    const { data: expenseRows, error: expenseQueryError } = await supabase
      .from('expenses')
      .select('id')
      .eq('outlet_id', session.outlet_id)
      .eq('date', session.date)
      .or(`session_id.eq.${sessionId},session_id.is.null`);
    if (expenseQueryError) throw expenseQueryError;

    const { data: purchaseRows, error: purchaseQueryError } = await supabase
      .from('material_purchases')
      .select('id')
      .eq('outlet_id', session.outlet_id)
      .eq('date', session.date)
      .or(`session_id.eq.${sessionId},session_id.is.null`);
    if (purchaseQueryError) throw purchaseQueryError;

    const saleIds = (salesRows || []).map((row: any) => row.id).filter(Boolean);
    const expenseIds = (expenseRows || []).map((row: any) => row.id).filter(Boolean);
    const purchaseIds = (purchaseRows || []).map((row: any) => row.id).filter(Boolean);

    if (saleIds.length > 0) {
      const { error } = await supabase
        .from('cash_transactions')
        .delete()
        .in('source_type', ['sale', 'sale_settlement', 'sale_refund'])
        .in('source_id', saleIds);
      if (error) throw error;

      // Keep this before deleting sales for schemas without ON DELETE CASCADE.
      const { error: saleItemsError } = await supabase
        .from('sale_items')
        .delete()
        .in('sale_id', saleIds);
      if (saleItemsError) throw saleItemsError;

      const { error: salesDeleteError } = await supabase
        .from('sales')
        .delete()
        .in('id', saleIds);
      if (salesDeleteError) throw salesDeleteError;
    }

    if (expenseIds.length > 0) {
      const { error } = await supabase
        .from('cash_transactions')
        .delete()
        .in('source_type', ['expense', 'expense_settlement', 'expense_refund'])
        .in('source_id', expenseIds);
      if (error) throw error;

      const { error: expensesDeleteError } = await supabase
        .from('expenses')
        .delete()
        .in('id', expenseIds);
      if (expensesDeleteError) throw expensesDeleteError;
    }

    if (purchaseIds.length > 0) {
      const { error } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('source_type', 'material_purchase')
        .in('source_id', purchaseIds);
      if (error) throw error;

      const { error: purchasesDeleteError } = await supabase
        .from('material_purchases')
        .delete()
        .in('id', purchaseIds);
      if (purchasesDeleteError) throw purchasesDeleteError;
    }

    // Safety net for any orphan ledger rows on the same session date.
    const { error: orphanLedgerCleanupError } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('outlet_id', session.outlet_id)
      .eq('transaction_date', session.date)
      .in('source_type', [
        'sale',
        'sale_settlement',
        'sale_refund',
        'expense',
        'expense_settlement',
        'expense_refund',
        'material_purchase',
      ]);
    if (orphanLedgerCleanupError) throw orphanLedgerCleanupError;

    const { error: sessionDeleteError } = await supabase
      .from('daily_sessions')
      .delete()
      .eq('id', sessionId);
    if (sessionDeleteError) throw sessionDeleteError;

    return NextResponse.json(
      {
        success: true,
        deleted: {
          sales: saleIds.length,
          expenses: expenseIds.length,
          material_purchases: purchaseIds.length,
          session: 1,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer()
      .from('daily_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

