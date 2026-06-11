export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from 'decimal.js';
import { recordCashTransaction } from '@/lib/cash/ledger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const limit = searchParams.get('limit') || '20';

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseServer()
      .from('profit_allocations')
      .select('*')
      .eq('outlet_id', outletId)
      .order('allocation_date', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/profit-allocations (v2.0)
 * 
 * New logic with hutang-priority:
 * 1. Auto-deduct hutang from profit_pending
 * 2. Create capital_repayments for hutang payments
 * 3. Top-up Kas Utama
 * 4. Allocate Simpan Uang with reason
 * 5. Calculate profit share (LUNAS only)
 * 
 * Request:
 * {
 *   outlet_id: string,
 *   allocation_month: string,  // "2026-06"
 *   allocation_date: string,   // YYYY-MM-DD
 *   profit_pending_amount: number,
 *   profit_after_hutang: number,
 *   hutang_payments: Record<investor_id, {investorName, amount}>,
 *   kas_utama_topup: number,
 *   simpan_uang_amount: number,
 *   simpan_reason: string,
 *   user_choice: 'full_profit' | 'available_kas' | 'custom',
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      outlet_id,
      allocation_month,
      allocation_date,
      profit_pending_amount,
      profit_after_hutang,
      hutang_payments,  // Record<investor_id, {investorName, amount}>
      kas_utama_topup,
      use_kas_utama_topup,
      simpan_uang_amount,
      simpan_reason,
      user_choice,
      notes,
    } = body;

    // Validate required fields
    if (!outlet_id || !allocation_month || !allocation_date) {
      return NextResponse.json(
        { error: 'Missing required: outlet_id, allocation_month, allocation_date' },
        { status: 400 }
      );
    }

    if (profit_pending_amount === undefined || profit_after_hutang === undefined) {
      return NextResponse.json(
        { error: 'Missing required: profit_pending_amount, profit_after_hutang' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const BUFFER_KAS_UTAMA = 100000; // Minimum buffer to keep in kas_utama after any top-up usage

    // ===== STEP 1: Create profit_allocation record =====
    const allocationRecord = {
      outlet_id,
      allocation_date,
      allocation_month,
      profit_pending_amount: parseFloat(profit_pending_amount),
      profit_after_hutang: parseFloat(profit_after_hutang),
      kas_utama_topup: parseFloat(kas_utama_topup) || 0,
      simpan_uang_amount: parseFloat(simpan_uang_amount) || 0,
      simpan_reason: simpan_reason || null,
      user_choice: user_choice || 'full_profit',
      notes: notes || null,
      // Legacy fields for compatibility
      total_profit: parseFloat(profit_pending_amount),
      reserve_amount: 0,
      distributed_amount: 0,
      period_label: null,
    };

    const { data: allocData, error: allocError } = await (supabase
      .from('profit_allocations') as any)
      .insert([allocationRecord])
      .select()
      .single();

    if (allocError) throw allocError;

    const allocationId = (allocData as any)?.id;
    let successResults: any = {
      allocation_id: allocationId,
      hutang_payments_created: 0,
      simpan_uang_allocated: 0,
      kas_topup_recorded: 0,
      warnings: [],
    };

    // ===== STEP 2: Validate hutang payments vs profit_pending and kas_utama =====
    // Calculate totals
    const totalRepaymentsRequested = hutang_payments
      ? Object.values(hutang_payments).reduce((s: number, v: any) => s + (parseFloat(v.amount) || 0), 0)
      : 0;

    // Fetch current balances early to validate kas top-up rules
    const { data: currentBalance } = await (supabase
      .from('financial_accounts') as any)
      .select('kas_utama_balance, profit_pending_balance, simpan_uang_balance')
      .eq('outlet_id', outlet_id)
      .single();

    const currentKas = parseFloat((currentBalance as any)?.kas_utama_balance || 0);
    const currentProfitPending = parseFloat((currentBalance as any)?.profit_pending_balance || 0);

    const shortfall = Math.max(0, totalRepaymentsRequested - (parseFloat(profit_pending_amount) || currentProfitPending));

    const kasTopupAmount = parseFloat(kas_utama_topup) || 0;

    if (shortfall > 0 && !use_kas_utama_topup) {
      return NextResponse.json({ error: 'Insufficient profit_pending to cover repayments; set use_kas_utama_topup to true or reduce repayment amounts' }, { status: 400 });
    }

    if (use_kas_utama_topup) {
      // Ensure kas topup covers the shortfall
      if (kasTopupAmount < shortfall) {
        return NextResponse.json({ error: `Kas top-up amount (${kasTopupAmount}) does not cover shortfall (${shortfall})` }, { status: 400 });
      }

      // Ensure kas topup does not violate buffer
      if (kasTopupAmount > currentKas - BUFFER_KAS_UTAMA) {
        return NextResponse.json({ error: `Kas utama top-up exceeds available kas after buffer (${BUFFER_KAS_UTAMA})` }, { status: 400 });
      }
    }

    // ===== STEP 3: Create capital_repayments for hutang payments =====
    if (hutang_payments && Object.keys(hutang_payments).length > 0) {
      const repaymentRecords = [];

      for (const [investorId, paymentInfo] of Object.entries(hutang_payments)) {
        const amount = (paymentInfo as any).amount || 0;
        if (amount > 0) {
          repaymentRecords.push({
            investor_id: investorId,
            outlet_id,
            repayment_date: allocation_date,
            amount,
            repayment_type: 'cicil', // Auto-deducted from profit, so cicil
            status: 'completed',
            method: 'profit_allocation',
            allocated_from_profit_allocation_id: allocationId,
            notes: `Auto-deducted dari profit pending (${allocation_month})`,
          });
        }
      }

      if (repaymentRecords.length > 0) {
        const { data: repaymentData, error: repaymentError } = await (supabase
          .from('capital_repayments') as any)
          .insert(repaymentRecords)
          .select();

        if (repaymentError) {
          console.warn('[POST /api/profit-allocations] Warning: Could not create repayments:', repaymentError);
          successResults.warnings.push('Failed to create some repayment records');
        } else {
          successResults.hutang_payments_created = repaymentData?.length || 0;
        }
      }
    }

    // ===== STEP 3: Allocate Simpan Uang =====
    if (parseFloat(simpan_uang_amount) > 0 && simpan_reason) {
      const { error: simpanError } = await supabase
        .from('simpan_uang_allocations')
        .insert({
          outlet_id,
          allocation_month,
          amount: parseFloat(simpan_uang_amount),
          reason: simpan_reason,
          status: 'active',
          created_at: new Date().toISOString(),
          created_by: 'system',
          notes: `Phase 2.0 allocation for ${allocation_month}`,
        });

      if (simpanError) {
        console.warn('[POST /api/profit-allocations] Warning: Could not create simpan_uang_allocation:', simpanError);
        successResults.warnings.push('Failed to create simpan_uang allocation record');
      } else {
        successResults.simpan_uang_allocated = 1;
      }
    }

    // ===== STEP 4: Update financial_accounts with kas top-up & simpan uang =====
    try {
      const simpanAmount = parseFloat(simpan_uang_amount) || 0;

      // Determine totals for deduction from profit_pending
      const sumRepayments = totalRepaymentsRequested;
      const profitDeducted = Math.min(currentProfitPending, sumRepayments + simpanAmount);

      // Kas topup is an outflow from kas_utama when used to cover shortfall
      const kasTopupUsed = use_kas_utama_topup ? kasTopupAmount : 0;

      const newKasUtama = parseFloat(new Decimal(currentKas - kasTopupUsed).toFixed(2));
      const newSimpanUang = parseFloat(new Decimal(((currentBalance as any)?.simpan_uang_balance || 0) + simpanAmount).toFixed(2));
      const newProfitPending = Math.max(0, parseFloat(new Decimal(((currentBalance as any)?.profit_pending_balance || 0) - profitDeducted).toFixed(2)));

      const { error: updateError } = await supabase
        .from('financial_accounts')
        .upsert(
          {
            outlet_id,
            kas_utama_balance: newKasUtama,
            kas_utama_last_updated: new Date().toISOString(),
            simpan_uang_balance: newSimpanUang,
            simpan_uang_last_updated: new Date().toISOString(),
            profit_pending_balance: newProfitPending,
            profit_pending_last_updated: new Date().toISOString(),
          },
          { onConflict: 'outlet_id' }
        );

      if (updateError) {
        console.warn('[POST /api/profit-allocations] Warning: Could not update financial_accounts:', updateError);
        successResults.warnings.push('Failed to update financial accounts');
      } else {
        successResults.kas_topup_recorded = kasTopupUsed;

        // Record cash transaction for kas top-up outflow (if any)
        if (kasTopupUsed > 0) {
          try {
            await recordCashTransaction({
              outlet_id,
              transaction_date: allocation_date,
              transaction_type: 'outflow',
              source_type: 'profit_allocation',
              source_id: allocationId,
              amount: kasTopupUsed,
              description: `Kas utama used to cover hutang shortfall for ${allocation_month}`,
            });
          } catch (txErr) {
            console.warn('[POST /api/profit-allocations] Warning: could not record kas top-up transaction', txErr);
            successResults.warnings.push('Failed to record kas top-up transaction');
          }
        }
      }
    } catch (updateErr) {
      console.warn('[POST /api/profit-allocations] Warning updating accounts:', updateErr);
      successResults.warnings.push('Error updating financial accounts');
    }

    // ===== RETURN SUCCESS =====
    return NextResponse.json(
      {
        success: true,
        allocation_id: allocationId,
        ...successResults,
        message: '✅ Alokasi laba v2.0 berhasil disimpan dengan hutang-priority logic',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/profit-allocations] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
