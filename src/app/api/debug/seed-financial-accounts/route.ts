import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Get total capital entries per outlet
    const { data: capitalData, error: capitalError } = await supabase
      .from('capital_entries')
      .select('outlet_id, amount');

    if (capitalError) throw capitalError;

    // Group by outlet_id and sum amounts
    const capitalByOutlet: Record<string, number> = {};
    capitalData?.forEach((entry: any) => {
      if (!capitalByOutlet[entry.outlet_id]) {
        capitalByOutlet[entry.outlet_id] = 0;
      }
      capitalByOutlet[entry.outlet_id] += entry.amount;
    });

    // Step 2: For each outlet, create financial_accounts if it doesn't exist
    const results = [];
    for (const [outletId, totalCapital] of Object.entries(capitalByOutlet)) {
      // Check if financial_accounts exists for this outlet
      const { data: existing } = await supabase
        .from('financial_accounts')
        .select('id')
        .eq('outlet_id', outletId)
        .single();

      if (!existing) {
        // Insert new financial_accounts record
        const { data: inserted, error: insertError } = await supabase
          .from('financial_accounts')
          .insert({
            outlet_id: outletId,
            kas_utama_balance: totalCapital,
            profit_pending_balance: 0,
            simpan_uang_balance: 0,
          })
          .select()
          .single();

        if (insertError) {
          results.push({
            outlet_id: outletId,
            status: 'error',
            error: insertError.message,
          });
        } else {
          results.push({
            outlet_id: outletId,
            status: 'seeded',
            kas_utama_balance: totalCapital,
            data: inserted,
          });
        }
      } else {
        results.push({
          outlet_id: outletId,
          status: 'already_exists',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Financial accounts seeded',
      results,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
