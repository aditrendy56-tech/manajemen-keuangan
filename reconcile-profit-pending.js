#!/usr/bin/env node

/**
 * Reconcile Script: Reset Profit Pending ke nilai yang benar
 * Ini akan:
 * 1. Ambil semua sales yang masih ada
 * 2. Hitung berapa profit pending seharusnya (40% dari net_amount)
 * 3. Update financial_accounts ke nilai yang benar
 * 4. Clean up orphaned profit_pending_transactions
 */

const { createClient } = require('@supabase/supabase-js');
const Decimal = require('decimal.js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reconcileProfitPending(outletId) {
  console.log(`\n🔍 Reconciling profit pending for outlet: ${outletId}`);

  try {
    // 1. Get all sales for this outlet
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, gross_amount, platform_fee, net_amount')
      .eq('outlet_id', outletId);

    if (salesError) throw salesError;

    console.log(`📊 Found ${sales?.length || 0} sales in database`);

    // 2. Calculate correct profit pending (40% of sum of net_amount)
    let correctProfitPending = 0;
    if (sales && sales.length > 0) {
      const totalNetAmount = sales.reduce((sum, sale) => {
        return new Decimal(sum).plus(new Decimal(sale.net_amount || sale.gross_amount || 0)).toNumber();
      }, 0);
      
      correctProfitPending = new Decimal(totalNetAmount).times(0.4).toNumber();
    }

    console.log(`✅ Correct profit pending should be: Rp ${correctProfitPending.toLocaleString('id-ID')}`);

    // 3. Get current financial account
    const { data: currentAccount, error: accountError } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('outlet_id', outletId)
      .single();

    if (accountError && accountError.code !== 'PGRST116') throw accountError;

    const currentProfitPending = currentAccount?.profit_pending_balance || 0;
    console.log(`📍 Current profit pending in DB: Rp ${currentProfitPending.toLocaleString('id-ID')}`);

    if (Math.abs(correctProfitPending - currentProfitPending) > 0.01) {
      console.log(`⚠️  MISMATCH DETECTED! Difference: Rp ${Math.abs(correctProfitPending - currentProfitPending).toLocaleString('id-ID')}`);

      // 4. Update financial_accounts to correct value
      const { error: updateError } = await supabase
        .from('financial_accounts')
        .upsert(
          {
            outlet_id: outletId,
            profit_pending_balance: correctProfitPending,
            profit_pending_last_updated: new Date().toISOString(),
          },
          { onConflict: 'outlet_id' }
        );

      if (updateError) throw updateError;
      console.log(`✅ Updated profit pending to: Rp ${correctProfitPending.toLocaleString('id-ID')}`);

      // 5. Clean up orphaned profit_pending_transactions
      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id);
        
        const { data: orphaned, error: orphanError } = await supabase
          .from('profit_pending_transactions')
          .select('id, sale_id')
          .eq('outlet_id', outletId)
          .not('sale_id', 'in', `(${saleIds.map(id => `"${id}"`).join(',')})`);

        if (!orphanError && orphaned && orphaned.length > 0) {
          console.log(`🗑️  Found ${orphaned.length} orphaned profit_pending_transactions`);
          
          const orphanIds = orphaned.map(o => o.id);
          const { error: deleteError } = await supabase
            .from('profit_pending_transactions')
            .delete()
            .in('id', orphanIds);

          if (deleteError) {
            console.warn(`⚠️  Failed to delete orphaned transactions:`, deleteError);
          } else {
            console.log(`✅ Deleted ${orphanIds.length} orphaned transactions`);
          }
        }
      } else {
        // No sales at all, so delete all profit_pending_transactions for this outlet
        const { error: deleteAllError } = await supabase
          .from('profit_pending_transactions')
          .delete()
          .eq('outlet_id', outletId);

        if (!deleteAllError) {
          console.log(`✅ Cleaned up all profit_pending_transactions (no sales remain)`);
        }
      }
    } else {
      console.log(`✅ Profit pending is correct, no changes needed`);
    }

    console.log(`\n✅ Reconciliation complete for outlet ${outletId}\n`);
  } catch (error) {
    console.error(`❌ Error reconciling outlet ${outletId}:`, error);
  }
}

async function main() {
  // Get outlet ID from command line or use demo outlet
  let outletId = process.argv[2];

  if (!outletId) {
    console.log('📋 No outlet ID provided, fetching all outlets...');
    const { data: outlets, error: outletsError } = await supabase
      .from('outlets')
      .select('id, name');

    if (outletsError) {
      console.error('❌ Failed to fetch outlets:', outletsError);
      process.exit(1);
    }

    console.log('\n📍 Available outlets:');
    outlets?.forEach((outlet, index) => {
      console.log(`${index + 1}. ${outlet.name} (${outlet.id})`);
    });

    if (outlets && outlets.length > 0) {
      outletId = outlets[0].id;
      console.log(`\n🎯 Using first outlet: ${outlets[0].name}`);
    } else {
      console.log('❌ No outlets found');
      process.exit(1);
    }
  }

  await reconcileProfitPending(outletId);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
