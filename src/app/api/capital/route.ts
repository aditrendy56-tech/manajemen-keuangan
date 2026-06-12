export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { recordCashTransaction, deleteCashTransactionsBySource } from '@/lib/cash/ledger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer().from('capital_entries')
      .select('*')
      .eq('outlet_id', outletId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      outlet_id, date, amount, source, notes, investor_id, source_type, category, items,
      hutang_status = 'cicilan',
      cicilan_amount,
      cicilan_start_date,
      cicilan_months,
      hutang_status_set_by
    } = body;

    if (!outlet_id || !date || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate hutang_status
    if (!['full_payment', 'cicilan'].includes(hutang_status)) {
      return NextResponse.json(
        { error: 'Invalid hutang_status. Must be full_payment or cicilan' },
        { status: 400 }
      );
    }

    // If cicilan, cicilan_amount is required
    if (hutang_status === 'cicilan' && !cicilan_amount) {
      return NextResponse.json(
        { error: 'cicilan_amount required when hutang_status is cicilan' },
        { status: 400 }
      );
    }

    const insertData = { 
      outlet_id, 
      date, 
      amount, 
      source, 
      notes,
      investor_id,
      source_type,
      category,
      items: items || null,
      hutang_status,
      cicilan_amount: hutang_status === 'cicilan' ? cicilan_amount : null,
      cicilan_start_date: hutang_status === 'cicilan' ? cicilan_start_date : null,
      cicilan_months: hutang_status === 'cicilan' ? cicilan_months : null,
      hutang_status_set_at: new Date().toISOString(),
      hutang_status_set_by: hutang_status_set_by || 'system'
    };
    const { data, error } = await (getSupabaseServer().from('capital_entries') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    await recordCashTransaction({
      outlet_id,
      transaction_date: date,
      transaction_type: 'inflow',
      source_type: 'capital_entry',
      source_id: data.id,
      amount: Number(amount),
      description: `Modal masuk${source ? ` - ${source}` : ''} (${hutang_status})`,
      notes: notes || null,
    });

    // Auto-initialize/update financial_accounts for dual-bucket system
    const supabase = getSupabaseServer();
    const { data: existingFinancial } = await supabase
      .from('financial_accounts')
      .select('kas_utama_balance')
      .eq('outlet_id', outlet_id)
      .single();

    if (!existingFinancial) {
      // Create new financial_accounts record with this capital entry
      await supabase.from('financial_accounts').insert({
        outlet_id,
        kas_utama_balance: Number(amount),
        profit_pending_balance: 0,
        simpan_uang_balance: 0,
      });
    } else {
      // Update existing kas_utama_balance by adding new capital amount
      const newBalance = (existingFinancial.kas_utama_balance || 0) + Number(amount);
      await supabase.from('financial_accounts')
        .update({
          kas_utama_balance: newBalance,
          kas_utama_last_updated: new Date().toISOString(),
        })
        .eq('outlet_id', outlet_id);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
