export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { recordCashTransaction } from '@/lib/cash/ledger';
import { validateExpenseTransaction } from '@/lib/cash/validation';
import { validateExpenseBucket, deductExpenseFromBucket } from '@/lib/cash/dual-bucket-v2';
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
      funding_source,
      funded_by_investor_id,
      kas_source,  // NEW: Specify bucket (kas_utama | simpan_uang)
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

    // VALIDATION: Category must be one of 3 types
    const validCategories = ['bahan', 'operasional', 'peralatan'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Only allowed: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // VALIDATION: Funding source
    const validFundingSources = ['kas', 'modal'];
    const finalFundingSource = funding_source || 'kas';
    if (!validFundingSources.includes(finalFundingSource)) {
      return NextResponse.json(
        { error: `Invalid funding_source. Must be kas or modal` },
        { status: 400 }
      );
    }

    // VALIDATION: If funding_source = modal, require investor_id
    if (finalFundingSource === 'modal' && !funded_by_investor_id) {
      return NextResponse.json(
        { error: 'funded_by_investor_id required when funding_source=modal' },
        { status: 400 }
      );
    }

    // VALIDATION: If funding_source = modal, verify investor exists
    if (finalFundingSource === 'modal' && funded_by_investor_id) {
      const { data: investor } = await getSupabaseServer()
        .from('investors')
        .select('id')
        .eq('id', funded_by_investor_id)
        .single();

      if (!investor) {
        return NextResponse.json(
          { error: 'Investor not found' },
          { status: 404 }
        );
      }
    }

    // NEW: VALIDATION - kas_source for dual-bucket system
    const validKasSources = ['kas_utama', 'simpan_uang'];
    const finalKasSource = kas_source || 'kas_utama';
    if (!validKasSources.includes(finalKasSource)) {
      return NextResponse.json(
        { error: `Invalid kas_source. Must be kas_utama or simpan_uang` },
        { status: 400 }
      );
    }

    const session = await resolveSessionForTransaction({
      autoCreate: false, // Require explicit session creation
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

    // VALIDATION: Cek apakah kas di bucket cukup untuk pengeluaran ini (unless force_override)
    if (!force_override) {
      console.log('[POST /api/expenses] Validating budget for kas_source:', finalKasSource, 'amount:', amount);
      const bucketValidation = await validateExpenseBucket(outlet_id, finalKasSource, parseFloat(amount));
      console.log('[POST /api/expenses] Bucket validation result:', JSON.stringify(bucketValidation));
      
      if (!bucketValidation.valid) {
        console.log('[POST /api/expenses] BUCKET_INSUFFICIENT - returning 400 with warning');
        return NextResponse.json({
          error: bucketValidation.reason,
          errorType: 'BUCKET_INSUFFICIENT',
          kas_source: finalKasSource,
          available: bucketValidation.available,
          requested: parseFloat(amount),
          shortfall: parseFloat(amount) - bucketValidation.available,
          status: 'warning'
        }, { status: 400 });
      }
      console.log('[POST /api/expenses] Bucket validation passed, proceeding with insert');
    }

    const insertData: any = {
      session_id: session.id,
      outlet_id,
      date,
      category,
      description,
      amount,
      funding_source: finalFundingSource,
      funded_by_investor_id: finalFundingSource === 'modal' ? funded_by_investor_id : null,
      kas_source: finalKasSource,  // NEW: Track which bucket this expense came from
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

      // NEW: Deduct from the specified bucket
      try {
        await deductExpenseFromBucket(outlet_id, finalKasSource, parseFloat(amount), data[0]?.id);
        console.log('[POST /api/expenses] Deducted amount from', finalKasSource);
      } catch (deductError) {
        console.error('[POST /api/expenses] Warning: Could not deduct from bucket:', deductError);
        // Don't throw - expense is already recorded, bucket deduction is best-effort
      }
    }

    console.log('[POST /api/expenses] Success, created expense:', data[0]?.id);
    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/expenses] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
  }
}


