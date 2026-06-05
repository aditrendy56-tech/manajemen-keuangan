/**
 * Cash Balance Calculation & Validation
 * Untuk memastikan working capital selalu positif
 */

import { getSupabaseServer } from '@/lib/supabase/server';

export interface CashBalance {
  totalCapitalIn: number;
  totalExpenses: number;
  totalSales: number;
  totalRefunds: number;
  availableCash: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

/**
 * Hitung cash balance saat ini untuk outlet
 * Available Cash = Total Modal + Total Penjualan (net of refunds) - Total Pengeluaran (net of refunds)
 * Refunds ditampilkan terpisah untuk visibility
 */
export async function calculateCashBalance(outletId: string): Promise<CashBalance> {
  const supabase = await getSupabaseServer();

  try {
    // Get total capital entries
    const { data: capitalData, error: capitalError } = await supabase
      .from('capital_entries')
      .select('amount')
      .eq('outlet_id', outletId);

    if (capitalError) throw capitalError;
    const totalCapitalIn = capitalData?.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0) || 0;

    // Get total sales with refund amounts
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('net_amount, refund_amount')
      .eq('outlet_id', outletId);

    if (salesError) throw salesError;
    const totalSalesGross = salesData?.reduce((sum, row) => sum + (parseFloat(row.net_amount) || 0), 0) || 0;
    const totalSalesRefunds = salesData?.reduce((sum, row) => sum + (parseFloat(row.refund_amount) || 0), 0) || 0;
    const totalSales = totalSalesGross - totalSalesRefunds;

    // Get total expenses with refund amounts
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, refund_amount')
      .eq('outlet_id', outletId);

    if (expensesError) throw expensesError;
    const totalExpensesGross = expensesData?.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0) || 0;
    const totalExpensesRefunds = expensesData?.reduce((sum, row) => sum + (parseFloat(row.refund_amount) || 0), 0) || 0;
    const totalExpenses = totalExpensesGross - totalExpensesRefunds;

    // Total refunds from both sales and expenses
    const totalRefunds = totalSalesRefunds + totalExpensesRefunds;

    // Calculate available cash
    const availableCash = totalCapitalIn + totalSales - totalExpenses;

    console.log('[calculateCashBalance] For outlet:', outletId, {
      totalCapitalIn,
      totalSalesGross,
      totalSalesRefunds,
      totalSales: totalSales,
      totalExpensesGross,
      totalExpensesRefunds,
      totalExpenses: totalExpenses,
      totalRefunds,
      availableCash,
    });

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = '✅ Kas sehat, operasional lancar';

    if (availableCash < 0) {
      status = 'critical';
      message = `❌ CRITICAL: Kas minus ${Math.abs(availableCash).toLocaleString('id-ID')}. Segera injeksi modal!`;
    } else if (availableCash < 100000) {
      // Warning jika kas kurang dari 100k
      status = 'warning';
      message = `⚠️ WARNING: Kas rendah ${availableCash.toLocaleString('id-ID')}. Siapkan injeksi modal jika ada pengeluaran besar.`;
    }

    return {
      totalCapitalIn,
      totalExpenses,
      totalSales,
      totalRefunds,
      availableCash,
      status,
      message,
    };
  } catch (error) {
    console.error('[calculateCashBalance] Error:', error);
    throw error;
  }
}

/**
 * Validate apakah pengeluaran bisa dilakukan
 * Return: { canProceed, availableCash, shortfall }
 */
export async function validateExpenseTransaction(
  outletId: string,
  expenseAmount: number
): Promise<{
  canProceed: boolean;
  availableCash: number;
  shortfall: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}> {
  try {
    const balance = await calculateCashBalance(outletId);

    const availableAfterExpense = balance.availableCash - expenseAmount;
    const canProceed = availableAfterExpense >= 0;
    const shortfall = canProceed ? 0 : Math.abs(availableAfterExpense);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = '✅ Pengeluaran dapat diproses';

    if (!canProceed) {
      status = 'critical';
      message = `❌ KAS TIDAK CUKUP!\nKas tersedia: ${balance.availableCash.toLocaleString('id-ID')}\nPengeluaran: ${expenseAmount.toLocaleString('id-ID')}\nKurang: ${shortfall.toLocaleString('id-ID')}\n\nPilihan:\n1. Injeksi modal\n2. Kurangi jumlah pengeluaran\n3. Tunda hingga ada penjualan`;
    } else if (availableAfterExpense < 100000) {
      status = 'warning';
      message = `⚠️ WARNING: Setelah pengeluaran ini, kas akan menjadi ${availableAfterExpense.toLocaleString('id-ID')}. Pertimbangkan injeksi modal.`;
    }

    return {
      canProceed,
      availableCash: balance.availableCash,
      shortfall,
      status,
      message,
    };
  } catch (error) {
    console.error('[validateExpenseTransaction] Error:', error);
    throw error;
  }
}

/**
 * Get breakdown pengeluaran per kategori
 * Berguna untuk dashboard analytics
 */
export async function getExpenseBreakdown(outletId: string) {
  const supabase = await getSupabaseServer();

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('outlet_id', outletId);

    if (error) throw error;

    const breakdown: Record<string, number> = {};
    data?.forEach((row) => {
      const category = row.category || 'Lainnya';
      breakdown[category] = (breakdown[category] || 0) + (parseFloat(row.amount) || 0);
    });

    return breakdown;
  } catch (error) {
    console.error('[getExpenseBreakdown] Error:', error);
    throw error;
  }
}
