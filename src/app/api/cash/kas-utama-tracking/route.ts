import { getSupabaseServer } from '@/lib/supabase/server';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outlet_id = searchParams.get('outlet_id');
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7); // YYYY-MM

    if (!outlet_id) {
      return Response.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();

    // Get current kas_utama balance
    const { data: financial, error: finError } = await supabase
      .from('financial_accounts')
      .select('kas_utama_balance')
      .eq('outlet_id', outlet_id)
      .single();

    if (finError) {
      return Response.json({ error: 'Financial account not found' }, { status: 404 });
    }

    const currentBalance = new Decimal(financial.kas_utama_balance || 0);

    // Get capital inputs (modal masuk)
    const { data: capitalInputs } = await supabase
      .from('capital_entries')
      .select('investor_id, amount, date, investors(name)')
      .eq('outlet_id', outlet_id)
      .order('date', { ascending: false });

    // Group capital by date and investor
    const capitalByDate = new Map<string, any[]>();
    let totalCapital = new Decimal(0);
    if (capitalInputs) {
      for (const entry of capitalInputs) {
        const date = entry.date;
        if (!capitalByDate.has(date)) {
          capitalByDate.set(date, []);
        }
        const amount = new Decimal(entry.amount || 0);
        capitalByDate.get(date)!.push({
          investor: entry.investors?.[0]?.name || 'Unknown',
          amount: amount.toNumber(),
        });
        totalCapital = totalCapital.plus(amount);
      }
    }

    const capitalTransactions = Array.from(capitalByDate.entries()).map(([date, items]) => ({
      date,
      items,
    }));

    // Get sales transactions (from cash_transactions with source='sales')
    const { data: salesTransactions } = await supabase
      .from('cash_transactions')
      .select('transaction_date, amount, description')
      .eq('outlet_id', outlet_id)
      .eq('source_type', 'sales')
      .gte('transaction_date', `${month}-01`)
      .lt('transaction_date', month === '2026-12' ? '2027-01-01' : `${String(parseInt(month.split('-')[1]) + 1).padStart(2, '0')}-01`)
      .order('transaction_date', { ascending: false });

    let totalSales = new Decimal(0);
    const salesList: any[] = [];
    if (salesTransactions) {
      for (const tx of salesTransactions) {
        const amount = new Decimal(tx.amount || 0);
        salesList.push({
          date: tx.transaction_date,
          amount: amount.toNumber(),
          description: tx.description,
        });
        totalSales = totalSales.plus(amount);
      }
    }

    // Get allocation profit inflows (from profit_allocations)
    const { data: allocationInflows } = await supabase
      .from('profit_allocations')
      .select('allocation_month, total_profit')
      .eq('outlet_id', outlet_id)
      .eq('allocation_month', month);

    let totalAllocationProfit = new Decimal(0);
    if (allocationInflows && allocationInflows.length > 0) {
      totalAllocationProfit = new Decimal(allocationInflows[0].total_profit || 0);
    }

    // Get operating expenses (from cash_transactions with type='outflow' and purpose='expenses')
    const { data: expenseTransactions } = await supabase
      .from('cash_transactions')
      .select('transaction_date, amount, description')
      .eq('outlet_id', outlet_id)
      .eq('source_type', 'expenses')
      .gte('transaction_date', `${month}-01`)
      .lt('transaction_date', month === '2026-12' ? '2027-01-01' : `${String(parseInt(month.split('-')[1]) + 1).padStart(2, '0')}-01`)
      .order('transaction_date', { ascending: false });

    let totalExpenses = new Decimal(0);
    const expensesList: any[] = [];
    if (expenseTransactions) {
      for (const tx of expenseTransactions) {
        const amount = new Decimal(tx.amount || 0);
        expensesList.push({
          date: tx.transaction_date,
          amount: amount.toNumber(),
          description: tx.description,
        });
        totalExpenses = totalExpenses.plus(amount);
      }
    }

    // Get cicilan repayments
    const { data: cilanRepayments } = await supabase
      .from('capital_repayments')
      .select('repayment_date, amount, investors(name)')
      .eq('outlet_id', outlet_id)
      .gte('repayment_date', `${month}-01`)
      .lt('repayment_date', month === '2026-12' ? '2027-01-01' : `${String(parseInt(month.split('-')[1]) + 1).padStart(2, '0')}-01`)
      .order('repayment_date', { ascending: false });

    let totalCilanRepayment = new Decimal(0);
    const cilanList: any[] = [];
    if (cilanRepayments) {
      for (const rp of cilanRepayments) {
        const amount = new Decimal(rp.amount || 0);
        cilanList.push({
          date: rp.repayment_date,
          amount: amount.toNumber(),
          investor: rp.investors?.[0]?.name || 'Unknown',
        });
        totalCilanRepayment = totalCilanRepayment.plus(amount);
      }
    }

    // Calculate net flow
    const totalInflows = totalCapital.plus(totalSales).plus(totalAllocationProfit);
    const totalOutflows = totalExpenses.plus(totalCilanRepayment);
    const netFlow = totalInflows.minus(totalOutflows);

    return Response.json({
      outlet_id,
      month,
      current_balance: currentBalance.toNumber(),
      
      sources: {
        capital_input: {
          label: 'Modal Masuk',
          total_amount: totalCapital.toNumber(),
          transactions: capitalTransactions,
        },
        sales: {
          label: 'Penjualan',
          total_amount: totalSales.toNumber(),
          transactions: salesList,
        },
        allocation_profit: {
          label: 'Alokasi Profit',
          total_amount: totalAllocationProfit.toNumber(),
          transactions: allocationInflows || [],
        },
      },
      
      outflows: {
        expenses: {
          label: 'Pengeluaran Operasional',
          total_amount: totalExpenses.toNumber(),
          transactions: expensesList,
        },
        allocation_cicilan: {
          label: 'Pembayaran Hutang (Cicilan)',
          total_amount: totalCilanRepayment.toNumber(),
          transactions: cilanList,
        },
      },
      
      net_flow: netFlow.toNumber(),
      
      calculation_breakdown: {
        opening_balance: 0, // TODO: calculate from previous month
        plus_sources: totalInflows.toNumber(),
        minus_outflows: totalOutflows.toNumber(),
        closing_balance: currentBalance.toNumber(),
      },
    });
  } catch (error: any) {
    console.error('[kas-utama-tracking] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
