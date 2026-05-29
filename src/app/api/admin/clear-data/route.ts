export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tables, outlet_id, mode, date } = await request.json();

    if (!outlet_id) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const outletId = outlet_id;

    // Safe QA mode: clear today's transactional data only.
    if (mode === 'today_test_data') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dayStart = `${targetDate}T00:00:00`;
      const dayEnd = `${targetDate}T23:59:59`;
      const supabase = getSupabaseServer();

      const results: Record<string, { success: boolean; error?: string; message?: string }> = {};

      try {
        const { error } = await supabase
          .from('cash_transactions')
          .delete()
          .eq('outlet_id', outletId)
          .eq('transaction_date', targetDate);
        if (error) throw error;
        results.cash_transactions = { success: true, message: `Deleted ${targetDate} cash transactions` };
      } catch (error: any) {
        results.cash_transactions = { success: false, error: error.message };
      }

      try {
        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('outlet_id', outletId)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);
        if (error) throw error;
        results.sales = { success: true, message: `Deleted ${targetDate} sales` };
      } catch (error: any) {
        results.sales = { success: false, error: error.message };
      }

      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('outlet_id', outletId)
          .eq('date', targetDate);
        if (error) throw error;
        results.expenses = { success: true, message: `Deleted ${targetDate} expenses` };
      } catch (error: any) {
        results.expenses = { success: false, error: error.message };
      }

      try {
        const { error } = await supabase
          .from('material_purchases')
          .delete()
          .eq('outlet_id', outletId)
          .eq('date', targetDate);
        if (error) throw error;
        results.material_purchases = { success: true, message: `Deleted ${targetDate} material purchases` };
      } catch (error: any) {
        results.material_purchases = { success: false, error: error.message };
      }

      try {
        const { error } = await supabase
          .from('capital_entries')
          .delete()
          .eq('outlet_id', outletId)
          .eq('date', targetDate);
        if (error) throw error;
        results.capital_entries = { success: true, message: `Deleted ${targetDate} capital entries` };
      } catch (error: any) {
        results.capital_entries = { success: false, error: error.message };
      }

      try {
        const { error } = await supabase
          .from('daily_sessions')
          .delete()
          .eq('outlet_id', outletId)
          .eq('date', targetDate);
        if (error) throw error;
        results.daily_sessions = { success: true, message: `Deleted ${targetDate} sessions` };
      } catch (error: any) {
        results.daily_sessions = { success: false, error: error.message };
      }

      return NextResponse.json({ success: true, mode, date: targetDate, results });
    }

    if (!tables || !Array.isArray(tables)) {
      return NextResponse.json({ error: 'tables array required' }, { status: 400 });
    }
    const results: any = {};

    for (const table of tables) {
      try {
        const { data, error } = await getSupabaseServer()
          .from(table)
          .delete()
          .eq('outlet_id', outletId);

        if (error) {
          results[table] = { success: false, error: error.message };
        } else {
          results[table] = { success: true, message: `Deleted from ${table}` };
        }
      } catch (tableError: any) {
        results[table] = { success: false, error: tableError.message };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
