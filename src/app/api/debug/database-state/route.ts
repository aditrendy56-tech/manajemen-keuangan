import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * DEBUG ENDPOINT - Check database state
 * GET /api/debug/database-state?outlet_id=xxx
 * Returns: Full database state for debugging data correlation
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outlet_id') || '660e8400-e29b-41d4-a716-446655440000';

    const supabase = await getSupabaseServer();

    // 1. Financial Accounts
    const { data: financialAccounts } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('outlet_id', outletId);

    // 2. Capital Entries
    const { data: capitalEntries } = await supabase
      .from('capital_entries')
      .select('*')
      .eq('outlet_id', outletId);

    // 3. Capital Repayments
    const { data: capitalRepayments } = await supabase
      .from('capital_repayments')
      .select('*')
      .eq('outlet_id', outletId);

    // 4. Sales
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .limit(10);

    // 5. Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .limit(10);

    // 6. Profit Allocations
    const { data: profitAllocations } = await supabase
      .from('profit_allocations')
      .select('*')
      .eq('outlet_id', outletId)
      .limit(5);

    // 7. Simpan Uang Allocations
    const { data: simpanUangAllocations } = await supabase
      .from('simpan_uang_allocations')
      .select('*')
      .eq('outlet_id', outletId);

    // 8. Investors
    const { data: investors } = await supabase
      .from('investors')
      .select('*');

    // CALCULATIONS
    const totalCapitalInput = capitalEntries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
    const totalCapitalRepaid = capitalRepayments?.reduce((sum, repay) => repay.amount || 0, 0) || 0;
    const outstandingCapital = totalCapitalInput - totalCapitalRepaid;

    const totalSales = sales?.reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    return Response.json({
      outlet_id: outletId,
      timestamp: new Date().toISOString(),
      
      // TABLE DATA
      tables: {
        financial_accounts: financialAccounts,
        capital_entries: capitalEntries,
        capital_repayments: capitalRepayments,
        sales: sales,
        expenses: expenses,
        profit_allocations: profitAllocations,
        simpan_uang_allocations: simpanUangAllocations,
        investors: investors,
      },

      // CALCULATIONS
      calculations: {
        total_capital_input: totalCapitalInput,
        total_capital_repaid: totalCapitalRepaid,
        outstanding_capital: outstandingCapital,
        total_sales: totalSales,
        total_expenses: totalExpenses,
        profit_estimate: totalSales - totalExpenses,
      },

      // CORRELATIONS TO CHECK
      correlations: {
        kas_utama_should_be_60_percent_of_sales: (totalSales * 0.6).toFixed(2),
        profit_pending_should_be_40_percent_of_sales: (totalSales * 0.4).toFixed(2),
        financial_accounts_kas_utama: financialAccounts?.[0]?.kas_utama_balance || 'NOT FOUND',
        financial_accounts_profit_pending: financialAccounts?.[0]?.profit_pending_balance || 'NOT FOUND',
        financial_accounts_simpan_uang: financialAccounts?.[0]?.simpan_uang_balance || 'NOT FOUND',
      },

      // WARNINGS
      warnings: {
        financial_accounts_empty: !financialAccounts || financialAccounts.length === 0,
        no_sales_recorded: !sales || sales.length === 0,
        no_capital_entries: !capitalEntries || capitalEntries.length === 0,
        kas_utama_not_split_correctly: 
          financialAccounts?.[0]?.kas_utama_balance !== (totalSales * 0.6).toFixed(2),
      },
    });
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
