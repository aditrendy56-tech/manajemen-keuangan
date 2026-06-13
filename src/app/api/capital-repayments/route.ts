export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { recordCashTransaction } from '@/lib/cash/ledger';
import Decimal from 'decimal.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const investorId = searchParams.get('investor_id');
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '50';

    let query = getSupabaseServer().from('capital_repayments')
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
    const {
      investor_id,
      amount,
      repayment_date,
      method,
      notes,
      repayment_type,
      remaining_modal,
      // Phase 4 fields
      profit_allocation_id,
      cicilan_number,
      capital_entry_id,
    } = body;

    if (!investor_id || !amount || !repayment_date) {
      return NextResponse.json(
        { error: 'Missing required fields: investor_id, amount, repayment_date' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // VALIDATION: repayment_type must be lunas or cicil
    const validRepaymentTypes = ['lunas', 'cicil'];
    const finalRepaymentType = repayment_type || 'lunas';
    if (!validRepaymentTypes.includes(finalRepaymentType)) {
      return NextResponse.json(
        { error: 'Invalid repayment_type. Must be lunas or cicil' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get investor and outlet info
    const { data: investorData, error: investorError } = await (supabase
      .from('investors')
      .select('id, outlet_id, remaining_balance, status')
      .eq('id', investor_id)
      .single() as any);

    if (investorError || !investorData) {
      return NextResponse.json(
        { error: 'Investor not found' },
        { status: 404 }
      );
    }

    const outletId = investorData.outlet_id;

    // GET CURRENT OUTSTANDING HUTANG
    const { data: investorHutang, error: hutangError } = await supabase
      .from('investors')
      .select('*')
      .eq('id', investor_id)
      .single();

    if (hutangError) throw hutangError;

    // Fetch capital entries to calculate current outstanding
    const { data: capitalEntries } = await supabase
      .from('capital_entries')
      .select('id, modal_masuk, hutang_status')
      .eq('investor_id', investor_id)
      .eq('outlet_id', outletId);

    let outstandingBefore = new Decimal(0);
    if (capitalEntries && capitalEntries.length > 0) {
      // Sum all modal masuk as outstanding before this payment
      outstandingBefore = capitalEntries.reduce((sum: Decimal, ce: any) => {
        return sum.plus(new Decimal(ce.modal_masuk || 0));
      }, new Decimal(0));
    }

    // Create repayment record with Phase 4 fields
    const repaymentInsertData: any = {
      investor_id,
      amount: amountDecimal.toString(),
      repayment_date,
      repayment_type: finalRepaymentType,
      remaining_modal: finalRepaymentType === 'cicil' ? remaining_modal : null,
      method,
      notes,
      // Phase 4 fields
      cicilan_number: cicilan_number || null,
      allocated_from_alokasi_laba: profit_allocation_id || null,
    };

    const { data: repaymentData, error: repaymentError } = await (supabase
      .from('capital_repayments') as any)
      .insert([repaymentInsertData])
      .select();

    if (repaymentError) throw repaymentError;

    // Calculate outstanding after payment
    const outstandingAfter = outstandingBefore.minus(amountDecimal);
    const repaymentId = repaymentData[0]?.id;

    // Record to repayment_tracking (Phase 4)
    if (repaymentId) {
      const trackingData: any = {
        investor_id,
        outlet_id: outletId,
        repayment_date,
        amount_paid: amountDecimal.toString(),
        repayment_type: finalRepaymentType,
        outstanding_before: outstandingBefore.toFixed(2),
        outstanding_after: outstandingAfter.toFixed(2),
        capital_entry_id: capital_entry_id || null,
        capital_repayment_id: repaymentId,
        profit_allocation_id: profit_allocation_id || null,
        payment_method: method || 'bank_transfer',
        notes: notes || null,
        created_by: 'user_import', // TODO: get actual user
      };

      const { error: trackingError } = await (supabase.from('repayment_tracking') as any)
        .insert([trackingData]);

      if (trackingError) {
        console.error('Error recording to repayment_tracking:', trackingError);
      }

      // Update cicilan_schedule if cicilan_number provided
      if (cicilan_number && capital_entry_id) {
        await supabase
          .from('cicilan_schedule')
          .update({
            status: 'paid',
            paid_date: repayment_date,
            repayment_tracking_id: repaymentId,
          })
          .eq('investor_id', investor_id)
          .eq('capital_entry_id', capital_entry_id)
          .eq('cicilan_number', cicilan_number);
      }

      // Update remaining_after_payment on capital_repayments
      await supabase
        .from('capital_repayments')
        .update({ remaining_after_payment: outstandingAfter.toFixed(2) })
        .eq('id', repaymentId);
    }

    // Update investor remaining balance
    const remaining = new Decimal(investorData.remaining_balance || 0);
    const newBalance = Decimal.max(remaining.minus(amountDecimal), new Decimal(0));
    const newStatus = newBalance.equals(0) ? 'settled' : 'partial';

    await (supabase.from('investors') as any)
      .update({ remaining_balance: newBalance.toFixed(2), status: newStatus })
      .eq('id', investor_id);

    // Record cash transaction
    await recordCashTransaction({
      outlet_id: outletId,
      transaction_date: repayment_date,
      transaction_type: 'outflow',
      source_type: 'repayment',
      source_id: repaymentId,
      amount: amountDecimal.toNumber(),
      description: `Pembayaran cicilan modal investor (cicilan ${cicilan_number || 'x'})`,
      notes: notes || null,
    });

    return NextResponse.json(
      {
        ...repaymentData[0],
        outstanding_before: outstandingBefore.toFixed(2),
        outstanding_after: outstandingAfter.toFixed(2),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording repayment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
