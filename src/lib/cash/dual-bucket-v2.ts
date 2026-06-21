/**
 * Dual-Bucket Financial System v2.0
 * 
 * Core calculations untuk Kas Utama, Profit Pending, dan Simpan Uang
 * 
 * Key Ratios:
 * - Sales inflow: 60% → Kas Utama, 40% → Profit Pending
 * - All expenses default: Kas Utama
 * - Allocation logic: Bayar hutang dulu, baru bagikan profit
 */

import { getSupabaseServer } from '@/lib/supabase/server';
import { Decimal } from 'decimal.js';

export interface FinancialBalance {
  kas_utama: number;
  profit_pending: number;
  simpan_uang: number;
  total_available: number;
  last_updated: string;
}

export interface SalesSplit {
  gross_amount: number;
  kas_utama_amount: number;
  profit_pending_amount: number;
  platform_fee?: number;
}

function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Calculate how much should go to each bucket from a sale
 * Ratio: 60% Kas Utama, 40% Profit Pending
 * 
 * Formula:
 * - Platform fee deducted first from gross
 * - Net amount split: 60/40
 */
export function calculateSalesSplit(grossAmount: number, platformFee: number = 0): SalesSplit {
  const netAmount = new Decimal(grossAmount).minus(platformFee);
  
  const kasUtama = netAmount.times(0.6).toNumber();
  const profitPending = netAmount.times(0.4).toNumber();
  
  return {
    gross_amount: grossAmount,
    kas_utama_amount: parseFloat(kasUtama.toFixed(2)),
    profit_pending_amount: parseFloat(profitPending.toFixed(2)),
    platform_fee: platformFee,
  };
}

/**
 * Get REAL-TIME financial balances calculated from transactions
 * ✅ This is now the single source of truth - calculates live from transactions
 * 
 * Formula:
 * - Kas Utama = capital_entries + (sales net * 0.6) - expenses
 * - Profit Pending = sales net * 0.4
 * - Simpan Uang = from financial_accounts (rarely changes)
 */
export async function getFinancialBalance(outletId: string): Promise<FinancialBalance> {
  try {
    if (!isValidUuid(outletId)) {
      return {
        kas_utama: 0,
        profit_pending: 0,
        simpan_uang: 0,
        total_available: 0,
        last_updated: new Date().toISOString(),
      };
    }

    const supabase = getSupabaseServer();
    
    // 1. Calculate Kas Utama from transactions
    // = Capital entries + (Sales * 0.6) - Expenses
    let kasUtamaBalance = new Decimal(0);
    let profitPendingBalance = new Decimal(0);
    
    // Get capital entries
    const { data: capitalEntries } = await supabase
      .from('capital_entries')
      .select('amount')
      .eq('outlet_id', outletId);
    
    if (capitalEntries) {
      for (const entry of capitalEntries) {
        kasUtamaBalance = kasUtamaBalance.plus(entry.amount || 0);
      }
    }
    
    // Get cash transactions (sales & expenses)
    const { data: cashTx } = await supabase
      .from('cash_transactions')
      .select('source_type, transaction_type, amount')
      .eq('outlet_id', outletId);
    
    if (cashTx) {
      for (const tx of cashTx) {
        const amount = new Decimal(tx.amount || 0);
        
        if (tx.source_type === 'sale' && tx.transaction_type === 'inflow') {
          // Sales: 60% to kas_utama, 40% to profit_pending
          kasUtamaBalance = kasUtamaBalance.plus(amount.times(0.6));
          profitPendingBalance = profitPendingBalance.plus(amount.times(0.4));
        } else if (tx.source_type === 'expense' && tx.transaction_type === 'outflow') {
          // Expenses deduct from kas_utama
          kasUtamaBalance = kasUtamaBalance.minus(amount);
        } else if (tx.source_type === 'allocation' && tx.transaction_type === 'inflow') {
          // Allocations add to kas_utama
          kasUtamaBalance = kasUtamaBalance.plus(amount);
        }
      }
    }
    
    // 2. Get Simpan Uang from database (rarely changes)
    const { data: faData } = await supabase
      .from('financial_accounts')
      .select('simpan_uang_balance, updated_at')
      .eq('outlet_id', outletId)
      .single();
    
    const simpanUang = new Decimal(faData?.simpan_uang_balance || 0);
    
    // 3. Calculate total available
    const totalAvailable = kasUtamaBalance
      .plus(profitPendingBalance)
      .plus(simpanUang);
    
    return {
      kas_utama: parseFloat(kasUtamaBalance.toFixed(2)),
      profit_pending: parseFloat(profitPendingBalance.toFixed(2)),
      simpan_uang: parseFloat(simpanUang.toFixed(2)),
      total_available: parseFloat(totalAvailable.toFixed(2)),
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[getFinancialBalance] Error:', error);
    // Fallback to zeros on error (better than returning stale data)
    return {
      kas_utama: 0,
      profit_pending: 0,
      simpan_uang: 0,
      total_available: 0,
      last_updated: new Date().toISOString(),
    };
  }
}

/**
 * Split sales between Kas Utama and Profit Pending
 * 
 * This function:
 * 1. Calculates split amounts
 * 2. Updates financial_accounts table
 * 3. Records transaction in profit_pending_transactions table
 * 4. Returns split details
 */
export async function splitSalesTransaction(
  outletId: string,
  saleId: string,
  grossAmount: number,
  platformFee: number = 0
): Promise<SalesSplit> {
  try {
    const supabase = getSupabaseServer();
    const split = calculateSalesSplit(grossAmount, platformFee);
    
    // 1. Get current balance
    const currentBalance = await getFinancialBalance(outletId);
    
    // 2. Calculate new balances
    const newKasUtama = new Decimal(currentBalance.kas_utama)
      .plus(split.kas_utama_amount)
      .toNumber();
    
    const newProfitPending = new Decimal(currentBalance.profit_pending)
      .plus(split.profit_pending_amount)
      .toNumber();
    
    // 3. Upsert financial_accounts
    const { error: accountError } = await supabase
      .from('financial_accounts')
      .upsert(
        {
          outlet_id: outletId,
          kas_utama_balance: newKasUtama,
          kas_utama_last_updated: new Date().toISOString(),
          profit_pending_balance: newProfitPending,
          profit_pending_last_updated: new Date().toISOString(),
        },
        { onConflict: 'outlet_id' }
      );
    
    if (accountError) throw accountError;
    
    // 4. Record in profit_pending_transactions for audit
    const { error: transactionError } = await supabase
      .from('profit_pending_transactions')
      .insert({
        outlet_id: outletId,
        sale_id: saleId,
        amount: split.profit_pending_amount,
        split_type: 'auto_split',
        status: 'pending',
        created_at: new Date().toISOString(),
        notes: `Auto-split from sale ${saleId}`,
      });
    
    if (transactionError) {
      console.warn('[splitSalesTransaction] Warning: Could not record profit_pending_transaction:', transactionError);
      // Don't throw - this is just audit trail
    }
    
    return split;
  } catch (error) {
    console.error('[splitSalesTransaction] Error:', error);
    throw error;
  }
}

export async function revertSalesSplit(
  outletId: string,
  saleId: string,
  grossAmount: number,
  platformFee: number = 0
): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    const split = calculateSalesSplit(grossAmount, platformFee);
    const currentBalance = await getFinancialBalance(outletId);

    const nextKasUtama = new Decimal(currentBalance.kas_utama).minus(split.kas_utama_amount).toNumber();
    const nextProfitPending = new Decimal(currentBalance.profit_pending).minus(split.profit_pending_amount).toNumber();

    const { error: accountError } = await supabase
      .from('financial_accounts')
      .upsert(
        {
          outlet_id: outletId,
          kas_utama_balance: Math.max(nextKasUtama, 0),
          kas_utama_last_updated: new Date().toISOString(),
          profit_pending_balance: Math.max(nextProfitPending, 0),
          profit_pending_last_updated: new Date().toISOString(),
        },
        { onConflict: 'outlet_id' }
      );

    if (accountError) throw accountError;

    const { error: deleteError } = await supabase
      .from('profit_pending_transactions')
      .delete()
      .eq('sale_id', saleId);

    if (deleteError) {
      console.warn('[revertSalesSplit] Warning: Could not remove profit_pending_transactions:', deleteError);
    }
  } catch (error) {
    console.error('[revertSalesSplit] Error:', error);
    throw error;
  }
}

/**
 * Validate expense can be paid from specified bucket
 * 
 * @param outletId - Outlet ID
 * @param kasSource - Which bucket: 'kas_utama' or 'simpan_uang'
 * @param amount - Expense amount
 * @returns { valid: boolean, reason?: string, available: number }
 */
export async function validateExpenseBucket(
  outletId: string,
  kasSource: string,
  amount: number
): Promise<{ valid: boolean; reason?: string; available: number }> {
  try {
    const balance = await getFinancialBalance(outletId);
    
    if (kasSource === 'kas_utama') {
      if (balance.kas_utama >= amount) {
        return { valid: true, available: balance.kas_utama };
      }
      return {
        valid: false,
        reason: `Kas Utama tidak cukup. Tersedia: Rp ${balance.kas_utama.toLocaleString('id-ID')}`,
        available: balance.kas_utama,
      };
    }
    
    if (kasSource === 'simpan_uang') {
      if (balance.simpan_uang >= amount) {
        return { valid: true, available: balance.simpan_uang };
      }
      return {
        valid: false,
        reason: `Simpan Uang tidak cukup. Tersedia: Rp ${balance.simpan_uang.toLocaleString('id-ID')}`,
        available: balance.simpan_uang,
      };
    }
    
    return {
      valid: false,
      reason: 'kas_source tidak valid. Gunakan: kas_utama atau simpan_uang',
      available: 0,
    };
  } catch (error) {
    console.error('[validateExpenseBucket] Error:', error);
    throw error;
  }
}

/**
 * Deduct expense from specified bucket
 * Updates financial_accounts and kas_source tracking
 */
export async function deductExpenseFromBucket(
  outletId: string,
  kasSource: string,
  amount: number,
  expenseId?: string
): Promise<FinancialBalance> {
  try {
    const supabase = getSupabaseServer();
    
    // Validate first
    const validation = await validateExpenseBucket(outletId, kasSource, amount);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    
    // Get current balance
    const currentBalance = await getFinancialBalance(outletId);
    
    // Calculate new balance based on kas_source
    let updateData: Record<string, any> = { outlet_id: outletId };
    
    if (kasSource === 'kas_utama') {
      const newBalance = new Decimal(currentBalance.kas_utama)
        .minus(amount)
        .toNumber();
      updateData.kas_utama_balance = newBalance;
      updateData.kas_utama_last_updated = new Date().toISOString();
    } else if (kasSource === 'simpan_uang') {
      const newBalance = new Decimal(currentBalance.simpan_uang)
        .minus(amount)
        .toNumber();
      updateData.simpan_uang_balance = newBalance;
      updateData.simpan_uang_last_updated = new Date().toISOString();
    }
    
    // Upsert financial_accounts
    const { error: updateError } = await supabase
      .from('financial_accounts')
      .upsert(updateData, { onConflict: 'outlet_id' });
    
    if (updateError) throw updateError;
    
    // Return new balance
    return getFinancialBalance(outletId);
  } catch (error) {
    console.error('[deductExpenseFromBucket] Error:', error);
    throw error;
  }
}

/**
 * Get profit pending total for a given month
 * Used in TabAllokasiLaba to see available profit for allocation
 */
export async function getProfitPendingForMonth(
  outletId: string,
  month: string // Format: "2026-06"
): Promise<{ total: number; transactions: number }> {
  try {
    const supabase = getSupabaseServer();
    
    // Get sum of profit_pending_transactions for month
    const { data, error } = await supabase
      .from('profit_pending_transactions')
      .select('amount')
      .eq('outlet_id', outletId)
      .eq('status', 'pending')
      .gte('created_at', `${month}-01T00:00:00Z`)
      .lt('created_at', `${month.substring(0, 7)}-32T00:00:00Z`); // Safe upper bound
    
    if (error) {
      console.warn('[getProfitPendingForMonth] Warning:', error);
      return { total: 0, transactions: 0 };
    }
    
    const total = (data || [])
      .reduce((sum: number, row: any) => sum + new Decimal(row.amount || 0).toNumber(), 0);
    
    return {
      total: parseFloat(total.toFixed(2)),
      transactions: (data || []).length,
    };
  } catch (error) {
    console.error('[getProfitPendingForMonth] Error:', error);
    throw error;
  }
}

/**
 * Check outstanding hutang (capital repayment pending)
 * Used to determine if investor has outstanding modal
 */
export async function getOutstandingHutang(
  investorId: string
): Promise<{ total: number; status: 'lunas' | 'cicil' | 'belum' }> {
  try {
    const supabase = getSupabaseServer();
    
    // Get total modal
    const { data: capitalData, error: capitalError } = await supabase
      .from('capital_entries')
      .select('amount')
      .eq('investor_id', investorId)
      .eq('status', 'active');
    
    if (capitalError) throw capitalError;
    
    const totalModalAmount = (capitalData || [])
      .reduce((sum: number, row: any) => sum + new Decimal(row.amount || 0).toNumber(), 0);
    
    if (totalModalAmount === 0) {
      return { total: 0, status: 'belum' };
    }
    
    // Get total repaid
    const { data: repaymentData, error: repaymentError } = await supabase
      .from('capital_repayments')
      .select('amount')
      .eq('investor_id', investorId)
      .eq('status', 'completed');
    
    if (repaymentError) throw repaymentError;
    
    const totalRepaidAmount = (repaymentData || [])
      .reduce((sum: number, row: any) => sum + new Decimal(row.amount || 0).toNumber(), 0);
    
    const outstanding = new Decimal(totalModalAmount)
      .minus(totalRepaidAmount)
      .toNumber();
    
    if (outstanding <= 0) {
      return { total: 0, status: 'lunas' };
    } else {
      return { total: parseFloat(outstanding.toFixed(2)), status: 'cicil' };
    }
  } catch (error) {
    console.error('[getOutstandingHutang] Error:', error);
    throw error;
  }
}
