export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { recordCashTransaction } from '@/lib/cash/ledger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const investorId = searchParams.get('investor_id');
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '50';

    const query = getSupabaseServer().from('capital_repayments')
      .select('*');

    if (investorId) {
      query = query.eq('investor_id', investorId);
    } else if (outletId) {
      // Get repayments for all investors in this outlet
      const { data: investors, error: investorError } = await getSupabaseServer()
        .from('investors')
        .select('id')
        .eq('outlet_id', outletId);

      if (investorError) throw investorError;

      if (investors && investors.length > 0) {
        const investorIds = (investors as any[]).map((inv: any) => inv.id);
        query = query.in('investor_id', investorIds);
      }
    }

    const { data, error } = await query
      .order('repayment_date', { ascending: false })
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
    const { investor_id, amount, repayment_date, method, notes } = body;

    if (!investor_id || !amount || !repayment_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create repayment record
    const { data: repaymentData, error: repaymentError } = await (getSupabaseServer().from('capital_repayments') as any)
      .insert([{
        investor_id,
        amount,
        repayment_date,
        method,
        notes
      }])
      .select();

    if (repaymentError) throw repaymentError;

    // Update investor remaining balance
    const { data: investorData, error: investorError } = await (getSupabaseServer()
      .from('investors')
      .select('remaining_balance, outlet_id')
      .eq('id', investor_id)
      .single() as any);

    if (investorError) throw investorError;

    if (investorData) {
      const remaining = (investorData as any).remaining_balance || 0;
      const newBalance = Math.max(0, remaining - amount);
      const newStatus = newBalance === 0 ? 'settled' : 'partial';

      await (getSupabaseServer()
        .from('investors') as any)
        .update({ remaining_balance: newBalance, status: newStatus })
        .eq('id', investor_id);
    }

    await recordCashTransaction({
      outlet_id: (investorData as any).outlet_id,
      transaction_date: repayment_date,
      transaction_type: 'outflow',
      source_type: 'repayment',
      source_id: repaymentData[0]?.id,
      amount: Number(amount),
      description: 'Pembayaran kembali modal investor',
      notes: notes || null,
    });

    return NextResponse.json(repaymentData[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
