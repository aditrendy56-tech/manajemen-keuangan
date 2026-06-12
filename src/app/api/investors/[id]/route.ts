export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from 'decimal.js';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: investorId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const isHutangStatusRequest = searchParams.get('hutang-status') === 'true';

    if (!investorId) {
      return NextResponse.json({ error: 'investor_id required' }, { status: 400 });
    }

    // Handle hutang-status query
    if (isHutangStatusRequest) {
      const supabase = getSupabaseServer();

      // Get investor's capital entries with hutang_status from DB
      const { data: capitalEntries, error: capitalError } = await supabase
        .from('capital_entries')
        .select('amount, hutang_status, cicilan_amount, cicilan_start_date, cicilan_months')
        .eq('investor_id', investorId);

      if (capitalError) throw capitalError;

      // Calculate totals
      const totalModalAmount = (capitalEntries || [])
        .reduce((sum, row) => sum + new Decimal(row.amount || 0).toNumber(), 0);

      // Get total repayment dari capital_repayments
      const { data: repayments, error: repaymentError } = await supabase
        .from('capital_repayments')
        .select('amount')
        .eq('investor_id', investorId);

      if (repaymentError) throw repaymentError;

      const totalRepaidAmount = (repayments || [])
        .reduce((sum, row) => sum + new Decimal(row.amount || 0).toNumber(), 0);

      // Calculate outstanding
      const outstanding = new Decimal(totalModalAmount)
        .minus(totalRepaidAmount)
        .toNumber();

      // Determine status berdasarkan DB hutang_status (not automatic)
      // If ANY capital entry punya hutang_status = 'full_payment', prioritas itu
      const hasFullPayment = capitalEntries?.some(c => c.hutang_status === 'full_payment');
      const hasCicilan = capitalEntries?.some(c => c.hutang_status === 'cicilan');
      
      let status: 'lunas' | 'cicil' | 'belum' | 'full_payment' = 'belum';
      
      if (totalModalAmount === 0) {
        status = 'belum';
      } else if (outstanding <= 0) {
        status = 'lunas';
      } else if (hasFullPayment && !hasCicilan) {
        // All entries are full_payment
        status = 'full_payment';
      } else {
        // Mix or all cicilan
        status = 'cicil';
      }

      // Get cicilan details jika ada
      const cicilanEntries = (capitalEntries || []).filter(c => c.hutang_status === 'cicilan');
      const cicilan_info = cicilanEntries.length > 0 ? {
        total_entries: cicilanEntries.length,
        monthly_amounts: cicilanEntries.map(c => c.cicilan_amount || 0),
        start_dates: cicilanEntries.map(c => c.cicilan_start_date),
        months_list: cicilanEntries.map(c => c.cicilan_months)
      } : null;

      const percentagePaid = totalModalAmount > 0
        ? (totalRepaidAmount / totalModalAmount) * 100
        : 0;

      return NextResponse.json({
        investor_id: investorId,
        total_modal: parseFloat(totalModalAmount.toFixed(2)),
        total_repaid: parseFloat(totalRepaidAmount.toFixed(2)),
        outstanding: parseFloat(outstanding.toFixed(2)),
        status,
        percentage_paid: parseFloat(percentagePaid.toFixed(2)),
        cicilan_info,
        capital_entries_count: capitalEntries?.length || 0
      });
    }

    // If not hutang-status request, return 400
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('[GET /api/investors/:id] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await getSupabaseServer().from('investors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
