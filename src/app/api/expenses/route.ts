export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { recordCashTransaction } from '@/lib/cash/ledger';
import { validateExpenseTransaction } from '@/lib/cash/validation';
import { resolveSessionForTransaction } from '@/lib/sessions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const sessionId = searchParams.get('session_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    console.log('[GET /api/expenses] Fetching expenses for outlet:', outletId);

    let query = (getSupabaseServer() as any)
      .from('expenses')
      .select(`
        *,
        raw_materials:raw_material_id (id, name, unit),
        suppliers:supplier_id (id, name)
      `)
      .eq('outlet_id', outletId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('[GET /api/expenses] Supabase error:', error);
      throw error;
    }

    console.log('[GET /api/expenses] Success, returned', data?.length, 'expenses');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GET /api/expenses] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      session_id, 
      outlet_id, 
      date, 
      category, 
      description, 
      amount, 
      notes, 
      payment_method, 
      payment_status, 
      settlement_date, 
      payment_reference, 
      force_override,
      raw_material_id,
      supplier_id,
      delivery_date,
      quality,
      invoice_number,
    } = body;

    console.log('[POST /api/expenses] Received:', { 
      session_id, 
      outlet_id, 
      date, 
      category, 
      description, 
      amount, 
      force_override,
      raw_material_id,
      supplier_id,
    });

    if (!outlet_id || !date || !category || !description || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: outlet_id, date, category, description, amount' },
        { status: 400 }
      );
    }

    const session = await resolveSessionForTransaction({
      sessionId: session_id,
      outletId: outlet_id,
      date,
    });

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Session belum tersedia. Buka sesi harian terlebih dahulu.' },
        { status: 400 }
      );
    }

    // VALIDATION: Cek apakah kas cukup untuk pengeluaran ini (unless force_override)
    if (!force_override) {
      console.log('[POST /api/expenses] Validating cash for amount:', amount);
      const validation = await validateExpenseTransaction(outlet_id, parseFloat(amount));
      console.log('[POST /api/expenses] Cash validation result:', JSON.stringify(validation));
      
      if (!validation.canProceed) {
        console.log('[POST /api/expenses] KAS_TIDAK_CUKUP - returning 400 with warning');
        // Return warning tapi jangan blocking - client bisa pilih untuk proceed dengan soft warning
        return NextResponse.json({
          error: validation.message,
          errorType: 'KAS_TIDAK_CUKUP',
          availableCash: validation.availableCash,
          requestedAmount: parseFloat(amount),
          shortfall: validation.shortfall,
          message: validation.message,
          status: 'warning' // Soft warning, bukan hard block
        }, { status: 400 });
      }
      console.log('[POST /api/expenses] Cash validation passed, proceeding with insert');
    }

    const insertData: any = {
      session_id: session.id,
      outlet_id,
      date,
      category,
      description,
      amount,
      notes,
      payment_method: payment_method || 'cash',
      payment_status: payment_status || 'paid',
      settlement_date: settlement_date || null,
      payment_reference: payment_reference || null,
    };

    // Add material fields if kategori = bahan
    if (category === 'bahan') {
      insertData.raw_material_id = raw_material_id || null;
      insertData.supplier_id = supplier_id || null;
      insertData.delivery_date = delivery_date || null;
      insertData.quality = quality || null;
      insertData.invoice_number = invoice_number || null;
    }

    let expenseResult = await (getSupabaseServer().from('expenses') as any)
      .insert([insertData])
      .select();

    let { data, error } = expenseResult;

    if (error && String(error.message || '').toLowerCase().includes('payment_method')) {
      const { payment_method: _paymentMethod, payment_status: _paymentStatus, settlement_date: _settlementDate, payment_reference: _paymentReference, ...legacyInsertData } = insertData as any;
      expenseResult = await (getSupabaseServer().from('expenses') as any)
        .insert([legacyInsertData])
        .select();
      ({ data, error } = expenseResult);
    }

    if (error) {
      console.error('[POST /api/expenses] Supabase error:', error);
      throw error;
    }

    if (String((data[0]?.payment_status || insertData.payment_status) || '').toLowerCase() === 'paid') {
      await recordCashTransaction({
        outlet_id,
        transaction_date: (data[0]?.settlement_date as string | null) || session.date || date,
        transaction_type: 'outflow',
        source_type: 'expense',
        source_id: data[0]?.id,
        amount: Number(amount),
        description: description,
        notes: notes || null,
      });
    }

    console.log('[POST /api/expenses] Success, created expense:', data[0]?.id);
    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/expenses] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
  }
}


