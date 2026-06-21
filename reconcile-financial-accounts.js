#!/usr/bin/env node
/**
 * Reconcile Financial Accounts
 * 
 * This script reconciles the financial_accounts table with actual transaction data
 * from cash_transactions, capital_entries, and profit_allocations.
 * 
 * Usage:
 * NEXT_PUBLIC_SUPABASE_URL='...' SUPABASE_SERVICE_ROLE_KEY='...' node reconcile-financial-accounts.js [outlet_id]
 */

const { createClient } = require('@supabase/supabase-js');
const Decimal = require('decimal.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getOutletIdFromUser() {
  console.log('📋 No outlet ID provided, fetching all outlets...\n');
  
  const { data: outlets } = await supabase
    .from('outlets')
    .select('id, name')
    .order('name');
  
  if (!outlets || outlets.length === 0) {
    throw new Error('No outlets found');
  }
  
  console.log('📍 Available outlets:');
  outlets.forEach((outlet, i) => {
    console.log(`${i + 1}. ${outlet.name} (${outlet.id})`);
  });
  
  const firstOutlet = outlets[0];
  console.log(`\n🎯 Using first outlet: ${firstOutlet.name}\n`);
  
  return firstOutlet.id;
}

async function reconcileOutlet(outletId) {
  console.log(`🔍 Reconciling financial accounts for outlet: ${outletId}\n`);
  
  try {
    // 1. Calculate kas_utama from transactions
    console.log('📊 Calculating KAS_UTAMA from transactions...');
    
    const { data: capitalEntries } = await supabase
      .from('capital_entries')
      .select('amount')
      .eq('outlet_id', outletId);
    
    const { data: cashTx } = await supabase
      .from('cash_transactions')
      .select('source_type, transaction_type, amount')
      .eq('outlet_id', outletId);
    
    let kasUtamaBalance = new Decimal(0);
    let profitPendingBalance = new Decimal(0);
    
    // Add capital entries
    if (capitalEntries) {
      const capitalTotal = capitalEntries.reduce((sum, entry) => sum.plus(entry.amount || 0), new Decimal(0));
      kasUtamaBalance = kasUtamaBalance.plus(capitalTotal);
      console.log(`  ✓ Capital entries: Rp ${capitalTotal.toLocaleString('id-ID')}`);
    }
    
    // Process cash transactions
    if (cashTx) {
      const salesInflow = new Decimal(0);
      const expenseOutflow = new Decimal(0);
      const allocationInflow = new Decimal(0);
      
      for (const tx of cashTx) {
        const amount = new Decimal(tx.amount || 0);
        
        if (tx.source_type === 'sale' && tx.transaction_type === 'inflow') {
          // Sales split: 60% to kas_utama, 40% to profit_pending
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
      
      console.log(`  ✓ Cash transactions processed`);
      console.log(`    - Kas Utama (after all): Rp ${kasUtamaBalance.toLocaleString('id-ID')}`);
      console.log(`    - Profit Pending: Rp ${profitPendingBalance.toLocaleString('id-ID')}`);
    }
    
    // 2. Get current financial account
    const { data: currentFA } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('outlet_id', outletId)
      .single();
    
    if (!currentFA) {
      console.log('⚠️  No financial account found, creating one...');
      const { error: insertError } = await supabase
        .from('financial_accounts')
        .insert({
          outlet_id: outletId,
          kas_utama_balance: kasUtamaBalance.toNumber(),
          profit_pending_balance: profitPendingBalance.toNumber(),
          simpan_uang_balance: 0,
        });
      
      if (insertError) throw insertError;
      console.log('✅ Financial account created\n');
      return;
    }
    
    // 3. Compare and update if needed
    console.log('\n📋 COMPARISON:');
    console.log(`OLD (Database):`);
    console.log(`  kas_utama_balance: Rp ${(currentFA.kas_utama_balance || 0).toLocaleString('id-ID')}`);
    console.log(`  profit_pending_balance: Rp ${(currentFA.profit_pending_balance || 0).toLocaleString('id-ID')}`);
    console.log(`\nNEW (Calculated):`);
    console.log(`  kas_utama_balance: Rp ${kasUtamaBalance.toLocaleString('id-ID')}`);
    console.log(`  profit_pending_balance: Rp ${profitPendingBalance.toLocaleString('id-ID')}`);
    
    const kasUtamaMatch = new Decimal(currentFA.kas_utama_balance || 0).equals(kasUtamaBalance);
    const profitPendingMatch = new Decimal(currentFA.profit_pending_balance || 0).equals(profitPendingBalance);
    
    if (kasUtamaMatch && profitPendingMatch) {
      console.log('\n✅ Financial accounts are correct, no changes needed');
      return;
    }
    
    // 4. Update financial_accounts
    console.log('\n⚠️  MISMATCH DETECTED! Updating...');
    
    const { error: updateError } = await supabase
      .from('financial_accounts')
      .update({
        kas_utama_balance: kasUtamaBalance.toNumber(),
        kas_utama_last_updated: new Date().toISOString(),
        profit_pending_balance: profitPendingBalance.toNumber(),
        profit_pending_last_updated: new Date().toISOString(),
      })
      .eq('outlet_id', outletId);
    
    if (updateError) throw updateError;
    
    console.log('✅ Financial accounts updated successfully!');
    console.log(`\n🎯 FINAL STATE:`);
    console.log(`  kas_utama_balance: Rp ${kasUtamaBalance.toLocaleString('id-ID')}`);
    console.log(`  profit_pending_balance: Rp ${profitPendingBalance.toLocaleString('id-ID')}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const outletId = process.argv[2] || await getOutletIdFromUser();
    await reconcileOutlet(outletId);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
