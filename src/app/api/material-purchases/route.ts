import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { recordCashTransaction } from '@/lib/cash/ledger';
import { validateExpenseTransaction } from '@/lib/cash/validation';
import { resolveSessionForTransaction } from '@/lib/sessions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const sessionId = searchParams.get('session_id');
    const supplierId = searchParams.get('supplier_id');
    const resolvedSession = sessionId
      ? await resolveSessionForTransaction({ sessionId })
      : null;

    let query = supabase
      .from('material_purchases')
      .select(`
        *,
        raw_materials:raw_material_id (id, name, unit),
        suppliers:supplier_id (id, name)
      `);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    if (sessionId && resolvedSession?.date) {
      query = query.eq('date', resolvedSession.date);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    let { data, error } = await query.order('date', { ascending: false });

    if (error && sessionId && String(error.message || '').toLowerCase().includes('session_id')) {
      const fallbackQuery = supabase
        .from('material_purchases')
        .select(`
          *,
          raw_materials:raw_material_id (id, name, unit),
          suppliers:supplier_id (id, name)
        `);

      if (outletId) {
        fallbackQuery.eq('outlet_id', outletId);
      }

      if (resolvedSession?.date) {
        fallbackQuery.eq('date', resolvedSession.date);
      }

      if (supplierId) {
        fallbackQuery.eq('supplier_id', supplierId);
      }

      ({ data, error } = await fallbackQuery.order('date', { ascending: false }));
    }

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();

    const {
      session_id,
      outlet_id,
      raw_material_id,
      supplier_id,
      date,
      quantity,
      unit_price,
      total_amount,
      quality,
      invoice_number,
      payment_status,
      delivery_date,
      notes,
      force_override,
    } = body;

    console.log('[POST /api/material-purchases] Received body:', {
      session_id,
      outlet_id,
      raw_material_id,
      quantity,
      unit_price,
      force_override,
    });

    // supplier_id is OPTIONAL - klo ga isi tetap bisa simpan
    if (!outlet_id || !raw_material_id || !quantity || !unit_price) {
      console.log('[POST /api/material-purchases] Validation error - missing required fields');
      return NextResponse.json(
        { error: 'outlet_id, raw_material_id, quantity, dan unit_price wajib diisi' },
        { status: 400 }
      );
    }

    console.log('[POST /api/material-purchases] Resolving session...');
    const session = await resolveSessionForTransaction({
      sessionId: session_id,
      outletId: outlet_id,
      date,
    });

    if (!session?.id) {
      console.log('[POST /api/material-purchases] Session error - session not found or invalid');
      return NextResponse.json(
        { error: 'Session belum tersedia. Buka sesi harian terlebih dahulu.' },
        { status: 400 }
      );
    }

    console.log('[POST /api/material-purchases] Session found:', session.id);

    // Validate cash balance before creating material purchase
    const totalAmount = Number(total_amount || (Number(quantity) * Number(unit_price)));
    console.log('[POST /api/material-purchases] Validating cash for amount:', totalAmount);
    
    const validation = await validateExpenseTransaction(outlet_id, totalAmount);
    
    console.log('[POST /api/material-purchases] Cash validation result:', {
      canProceed: validation.canProceed,
      availableCash: validation.availableCash,
      shortfall: validation.shortfall,
    });
    
    if (!validation.canProceed && !force_override) {
      // Soft warning - return 400 but allow client to override
      console.log('[POST /api/material-purchases] Returning cash warning (soft warning)');
      return NextResponse.json(
        {
          error: validation.message,
          errorType: 'KAS_TIDAK_CUKUP',
          status: 'warning',
          availableCash: validation.availableCash,
          requestedAmount: totalAmount,
          shortfall: validation.shortfall,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    if (!validation.canProceed && force_override) {
      console.log('[POST /api/material-purchases] Cash validation failed but force_override=true, proceeding anyway');
    }

    const insertData = {
      session_id: session.id,
      outlet_id,
      raw_material_id,
      supplier_id: supplier_id || null,
      date,
      quantity,
      unit_price,
      total_amount,
      quality,
      invoice_number,
      payment_status,
      delivery_date,
      notes,
    };

    console.log('[POST /api/material-purchases] Inserting into database...');
    let { data, error } = await (supabase
      .from('material_purchases') as any)
      .insert([insertData])
      .select()
      .single();

    if (error && String(error.message || '').toLowerCase().includes('session_id')) {
      console.log('[POST /api/material-purchases] Session field error, retrying without session_id...');
      const { session_id: _sessionId, ...legacyInsertData } = insertData as any;
      ({ data, error } = await (supabase
        .from('material_purchases') as any)
        .insert([legacyInsertData])
        .select()
        .single());
    }

    if (error) {
      console.error('[POST /api/material-purchases] Database error:', error);
      throw error;
    }

    console.log('[POST /api/material-purchases] Insert successful, recording cash transaction...');

    await recordCashTransaction({
      outlet_id,
      transaction_date: session.date || date,
      transaction_type: 'outflow',
      source_type: 'material_purchase',
      source_id: data.id,
      amount: Number(total_amount || (Number(quantity) * Number(unit_price))),
      description: `Pembelian bahan${raw_material_id ? '' : ''}`,
      notes: notes || null,
    });

    console.log('[POST /api/material-purchases] Success! Created purchase:', data.id);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/material-purchases] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase', details: error.toString() },
      { status: 500 }
    );
  }
}
