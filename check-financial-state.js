const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkState() {
  const outletId = '660e8400-e29b-41d4-a716-446655440000';

  console.log('📊 Checking financial state...\n');

  // Check financial_accounts
  const { data: finances, error: finError } = await supabase
    .from('financial_accounts')
    .select('*')
    .eq('outlet_id', outletId);

  if (finError) {
    console.error('❌ Error fetching financial_accounts:', finError.message);
  } else {
    console.log('💰 financial_accounts:', finances?.length || 0, 'records');
    finances?.forEach(f => {
      console.log(`  - kas_utama: ${f.kas_utama_balance}, profit_pending: ${f.profit_pending_balance}`);
    });
  }

  // Check sales count
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id')
    .eq('outlet_id', outletId);

  if (salesError) {
    console.error('❌ Error fetching sales:', salesError.message);
  } else {
    console.log(`\n📦 sales: ${sales?.length || 0} records`);
  }

  // Check sale_items count
  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('id');

  if (itemsError) {
    console.error('❌ Error fetching sale_items:', itemsError.message);
  } else {
    console.log(`📋 sale_items: ${items?.length || 0} records`);
  }

  // Check profit_pending_transactions count
  const { data: profitTx, error: profitError } = await supabase
    .from('profit_pending_transactions')
    .select('id');

  if (profitError) {
    console.error('❌ Error fetching profit_pending_transactions:', profitError.message);
  } else {
    console.log(`💸 profit_pending_transactions: ${profitTx?.length || 0} records`);
  }

  // Check daily_sessions count
  const { data: sessions, error: sessionError } = await supabase
    .from('daily_sessions')
    .select('id')
    .eq('outlet_id', outletId);

  if (sessionError) {
    console.error('❌ Error fetching daily_sessions:', sessionError.message);
  } else {
    console.log(`📅 daily_sessions: ${sessions?.length || 0} records`);
  }

  console.log('\n✅ State check complete');
}

checkState().catch(console.error);
