import { getSupabaseServer } from '@/lib/supabase/server';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

type CapitalEntry = {
  date?: string | null;
  amount?: number | string | null;
  investors?: Array<{ name?: string | null }> | null;
};

type SaleTransaction = {
  source_id?: string | null;
  transaction_date?: string | null;
  amount?: number | string | null;
  description?: string | null;
};

type SaleRecord = {
  id: string;
  gross_amount?: number | string | null;
  platform_fee?: number | string | null;
  net_amount?: number | string | null;
};

type ExpenseTransaction = {
  transaction_date?: string | null;
  amount?: number | string | null;
  description?: string | null;
};

type RepaymentRecord = {
  repayment_date?: string | null;
  amount?: number | string | null;
  investors?: Array<{ name?: string | null }> | null;
};

type CapitalItem = {
  investor: string;
  amount: number;
};

function getMonthBounds(month: string) {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const currentMonth = Number(monthStr);
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? year + 1 : year;

  return {
    start: `${year}-${String(currentMonth).padStart(2, '0')}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outlet_id = searchParams.get('outlet_id');
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7); // YYYY-MM

    if (!outlet_id) {
      return Response.json({ error: 'outlet_id required' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();
    const monthBounds = getMonthBounds(month);

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
    const capitalByDate = new Map<string, CapitalItem[]>();
    let totalCapital = new Decimal(0);
    if (capitalInputs) {
      for (const entry of capitalInputs as CapitalEntry[]) {
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

    // Get sales inflows and convert them to the same 60/40 split used by the balance cards.
    const { data: salesTransactions } = await supabase
      .from('cash_transactions')
      .select('id, transaction_date, amount, description, source_id')
      .eq('outlet_id', outlet_id)
      .eq('source_type', 'sale')
      .eq('transaction_type', 'inflow')
      .gte('transaction_date', monthBounds.start)
      .lt('transaction_date', monthBounds.end)
      .order('transaction_date', { ascending: false });

    let totalSales = new Decimal(0);
    const salesList: Array<{
      date: string | null;
      amount: number;
      profit_pending_amount: number;
      gross_amount: number;
      description: string | null;
    }> = [];
    const saleIds = (salesTransactions || [])
      .map((tx: SaleTransaction) => tx.source_id)
      .filter((id): id is string => Boolean(id));

    const saleMap = new Map<string, SaleRecord>();
    if (saleIds.length > 0) {
      const { data: saleRows } = await supabase
        .from('sales')
        .select('id, gross_amount, platform_fee, net_amount')
        .in('id', saleIds);

      (saleRows || []).forEach((sale: SaleRecord) => {
        saleMap.set(sale.id, sale);
      });
    }

    if (salesTransactions) {
      for (const tx of salesTransactions as SaleTransaction[]) {
        const saleRow = tx.source_id ? saleMap.get(tx.source_id) : null;
        const netAmount = Number(
          (saleRow?.net_amount ?? (Number(saleRow?.gross_amount || 0) - Number(saleRow?.platform_fee || 0))) ??
          (tx.amount || 0)
        );
        const kasUtamaAmount = new Decimal(netAmount).times(0.6);
        const profitPendingAmount = new Decimal(netAmount).times(0.4);

        salesList.push({
          date: tx.transaction_date,
          amount: kasUtamaAmount.toNumber(),
          profit_pending_amount: profitPendingAmount.toNumber(),
          gross_amount: Number(tx.amount || 0),
          description: tx.description,
        });

        totalSales = totalSales.plus(kasUtamaAmount);
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
      .eq('source_type', 'expense')
      .gte('transaction_date', monthBounds.start)
      .lt('transaction_date', monthBounds.end)
      .order('transaction_date', { ascending: false });

    let totalExpenses = new Decimal(0);
    const expensesList: Array<{
      date: string | null;
      amount: number;
      description: string | null;
    }> = [];
    if (expenseTransactions) {
      for (const tx of expenseTransactions as ExpenseTransaction[]) {
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
      .gte('repayment_date', monthBounds.start)
      .lt('repayment_date', monthBounds.end)
      .order('repayment_date', { ascending: false });

    let totalCilanRepayment = new Decimal(0);
    const cilanList: Array<{
      date: string | null;
      amount: number;
      investor: string;
    }> = [];
    if (cilanRepayments) {
      for (const rp of cilanRepayments as RepaymentRecord[]) {
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
          label: 'Penjualan (60% ke Kas Utama)',
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
        closing_balance: netFlow.toNumber(), // ✅ Use calculated value, not database balance
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[kas-utama-tracking] Error:', error);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
