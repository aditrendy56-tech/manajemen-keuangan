#!/usr/bin/env node
/**
 * Debug script untuk reconcile dashboard numbers
 * Jalankan: node debug-reconcile.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manual
function loadEnv(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File tidak ditemukan: ${filepath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;
    const key = line.substring(0, eqIdx).trim();
    const val = line.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val) {
      env[key] = val;
    }
  });
  return env;
}

const envPath = path.join(process.cwd(), '.env.local');
const envVars = loadEnv(envPath);

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL atau SUPABASE_KEY di .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔍 Reconcile Dashboard Data\n');
  
  try {
    // 1. Get default outlet
    console.log('1️⃣ Cari outlet default...');
    const { data: outlets, error: outletsErr } = await supabase
      .from('outlets')
      .select('id, name')
      .limit(1);
    
    if (outletsErr) throw outletsErr;
    if (!outlets || outlets.length === 0) {
      console.error('❌ Tidak ada outlet ditemukan');
      process.exit(1);
    }
    
    const outletId = outlets[0].id;
    const outletName = outlets[0].name;
    console.log(`✅ Outlet: ${outletName} (${outletId})\n`);
    
    // Pre-declare variables for reconciliation
    let allSales = [];
    let profitTx = [];
    let capitalEntries = [];
    
    // 2. Financial accounts
    console.log('2️⃣ Financial Accounts:');
    const { data: financialAccounts, error: finErr } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('outlet_id', outletId);
    
    if (finErr) throw finErr;
    if (financialAccounts && financialAccounts.length > 0) {
      const fa = financialAccounts[0];
      console.log(`   kas_utama_balance: ${fa.kas_utama_balance}`);
      console.log(`   profit_pending_balance: ${fa.profit_pending_balance}`);
      console.log(`   simpan_uang_balance: ${fa.simpan_uang_balance || 0}\n`);
    } else {
      console.log('   ❌ Tidak ada financial account\n');
    }
    
    // 3. Capital entries (modal masuk)
    console.log('3️⃣ Capital Entries (Modal Masuk):');
    const { data: capData, error: capErr } = await supabase
      .from('capital_entries')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (capErr) throw capErr;
    capitalEntries = capData || [];
    if (capitalEntries.length > 0) {
      let totalCapital = 0;
      capitalEntries.forEach(ce => {
        console.log(`   ${ce.created_at}: ${ce.amount} (${ce.investor_id || 'N/A'})`);
        totalCapital += ce.amount || 0;
      });
      console.log(`   Total modal: ${totalCapital}\n`);
    } else {
      console.log('   ❌ Tidak ada capital entries\n');
    }
    
    // 4. Sales (recent + aggregates)
    console.log('4️⃣ Sales (Recent):');
    
    // Get ALL sales for total calculation (tanpa limit)
    const { data: allSalesData, error: allSalesErr } = await supabase
      .from('sales')
      .select('*')
      .eq('outlet_id', outletId);
    
    if (allSalesErr) throw allSalesErr;
    allSales = allSalesData || [];
    
    // Display recent for reference
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (salesErr) throw salesErr;
    
    if (sales && sales.length > 0) {
      let displayGross = 0, displayNet = 0, displayFee = 0;
      console.log(`   Showing first 10 of ${allSales.length} sales:`);
      console.log('   ID | Date | Gross | Net | Platform Fee');
      sales.forEach(s => {
        const date = new Date(s.created_at).toLocaleDateString('id-ID');
        console.log(`   ${s.id.substring(0, 8)}... | ${date} | ${s.gross_amount} | ${s.net_amount} | ${s.platform_fee || 0}`);
        displayGross += s.gross_amount || 0;
        displayNet += s.net_amount || 0;
        displayFee += s.platform_fee || 0;
      });
      
      // Calculate totals from ALL sales
      let totalGross = 0, totalNet = 0, totalFee = 0;
      if (allSales && allSales.length > 0) {
        allSales.forEach(s => {
          totalGross += s.gross_amount || 0;
          totalNet += s.net_amount || 0;
          totalFee += s.platform_fee || 0;
        });
      }
      
      console.log(`\n   Displayed (${sales.length} recent): Gross ${displayGross} | Net ${displayNet} | Fee ${displayFee}`);
      console.log(`\n   TOTALS (ALL ${allSales?.length || 0} sales):`);
      console.log(`   - Total Gross: ${totalGross}`);
      console.log(`   - Total Net: ${totalNet}`);
      console.log(`   - Total Platform Fee: ${totalFee}`);
      console.log(`   - Expected Kas Utama (60% of net): ${(totalNet * 0.6).toFixed(2)}`);
      console.log(`   - Expected Profit Pending (40% of net): ${(totalNet * 0.4).toFixed(2)}\n`);
    } else {
      console.log('   ❌ Tidak ada sales\n');
    }
    
    // 5. Profit pending transactions (DETAILED BREAKDOWN)
    console.log('5️⃣ Profit Pending Transactions (DETAILED BREAKDOWN):');
    const { data: profitTxData, error: profitErr } = await supabase
      .from('profit_pending_transactions')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false });
    
    if (profitErr) throw profitErr;
    profitTx = profitTxData || [];
    if (profitTx.length > 0) {
      let totalProfit = 0;
      console.log(`   Total: ${profitTx.length} profit TX\n`);
      console.log('   Date | Amount | Sale ID | Split Type | Status');
      console.log('   ' + '-'.repeat(70));
      profitTx.forEach(pt => {
        const date = new Date(pt.created_at).toLocaleDateString('id-ID');
        const saleIdShort = pt.sale_id ? pt.sale_id.substring(0, 8) : 'N/A';
        console.log(`   ${date} | ${String(pt.amount).padStart(6)} | ${saleIdShort}... | ${String(pt.split_type).padEnd(10)} | ${pt.status}`);
        totalProfit += pt.amount || 0;
      });
      console.log('   ' + '-'.repeat(70));
      console.log(`   TOTAL: ${totalProfit}\n`);
    } else {
      console.log('   ❌ Tidak ada profit pending transactions\n');
    }
    
    // 6. Cash transactions (optional - might not exist)
    console.log('6️⃣ Cash Transactions (Cash In):');
    try {
      const { data: cashTx, error: cashErr } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('type', 'in')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (cashErr) {
        if (cashErr.message.includes('does not exist')) {
          console.log('   ⚠️  Tabel cash_transactions belum ada (skip)\n');
        } else {
          throw cashErr;
        }
      } else if (cashTx && cashTx.length > 0) {
        let totalCash = 0;
        console.log('   ID | Date | Amount | Source');
        cashTx.slice(0, 10).forEach(ct => {
          const date = new Date(ct.created_at).toLocaleDateString('id-ID');
          console.log(`   ${ct.id.substring(0, 8)}... | ${date} | ${ct.amount} | ${ct.source}`);
          totalCash += ct.amount || 0;
        });
        console.log(`   Total Cash In: ${totalCash}\n`);
      } else {
        console.log('   ❌ Tidak ada cash transactions\n');
      }
    } catch (err) {
      console.log(`   ⚠️  Tabel tidak dapat diakses (skip): ${err.message}\n`);
    }
    
    // 7. Reconciliation
    console.log('7️⃣ RECONCILIATION SUMMARY:');
    console.log('='.repeat(60));
    
    const fa = financialAccounts?.[0];
    const totalCapital = capitalEntries?.reduce((sum, ce) => sum + (ce.amount || 0), 0) || 0;
    const totalGross = allSales?.reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
    const totalNet = allSales?.reduce((sum, s) => sum + (s.net_amount || 0), 0) || 0;
    const totalFee = allSales?.reduce((sum, s) => sum + (s.platform_fee || 0), 0) || 0;
    const totalProfitTx = profitTx?.reduce((sum, pt) => sum + (pt.amount || 0), 0) || 0;
    const expectedKasUtama = totalNet * 0.6 + totalCapital;
    const expectedProfitPending = totalNet * 0.4;
    
    console.log(`\nActual (dari financial_accounts):`);
    console.log(`  Kas Utama: ${fa?.kas_utama_balance || 0}`);
    console.log(`  Profit Pending: ${fa?.profit_pending_balance || 0}`);
    
    console.log(`\nExpected (modal + 60/40 split of visible sales):`);
    console.log(`  Expected Kas Utama: ${expectedKasUtama.toFixed(2)} (${totalCapital} modal + ${(totalNet * 0.6).toFixed(2)} dari ${allSales?.length || 0} sales)`);
    console.log(`  Expected Profit Pending: ${expectedProfitPending.toFixed(2)}`);
    
    console.log(`\nInput sources:`);
    console.log(`  Total Modal (capital_entries): ${totalCapital}`);
    console.log(`  Total Gross Sales: ${totalGross} (${allSales?.length || 0} sales)`);
    console.log(`  Total Net Sales: ${totalNet}`);
    console.log(`  Total Platform Fee: ${totalFee}`);
    console.log(`  Total Profit Pending TX: ${totalProfitTx.toFixed(2)} (${profitTx?.length || 0} transactions)`);
    
    console.log(`\nDiscrepancy analysis:`);
    const kasDiff = (fa?.kas_utama_balance || 0) - expectedKasUtama;
    const profitDiff = (fa?.profit_pending_balance || 0) - expectedProfitPending;
    const profitTxDiff = totalProfitTx - expectedProfitPending;
    console.log(`  Kas Utama: ${(fa?.kas_utama_balance || 0).toFixed(2)} vs expected ${expectedKasUtama.toFixed(2)}`);
    console.log(`    Diff: ${kasDiff.toFixed(2)} ${kasDiff > 0 ? '(MORE)' : '(LESS)'}`);
    console.log(`  Profit Pending: ${(fa?.profit_pending_balance || 0).toFixed(2)} vs expected ${expectedProfitPending.toFixed(2)}`);
    console.log(`    Diff: ${profitDiff.toFixed(2)} ${profitDiff > 0 ? '(MORE)' : '(LESS)'}`);
    console.log(`  Profit TX total: ${totalProfitTx.toFixed(2)} vs expected ${expectedProfitPending.toFixed(2)}`);
    console.log(`    Diff: ${profitTxDiff.toFixed(2)} ${profitTxDiff > 0 ? '(MORE)' : '(LESS)'}`);
    
    // Calculate implied total net sales from profit TX
    if (totalProfitTx > 0) {
      const impliedTotalNet = totalProfitTx / 0.4;
      const impliedTotalKas = impliedTotalNet * 0.6 + totalCapital;
      console.log(`\n⚠️  ANALYSIS: Profit TX total ${totalProfitTx.toFixed(2)} implies:`);
      console.log(`    Total Net Sales (40% split): ${impliedTotalNet.toFixed(2)}`);
      console.log(`    Expected Kas Utama: ${impliedTotalKas.toFixed(2)}`);
      console.log(`    Missing Net Sales: ${(impliedTotalNet - totalNet).toFixed(2)}`);
      if (impliedTotalNet > totalNet) {
        const missingAmount = impliedTotalNet - totalNet;
        console.log(`    → Ada ${missingAmount.toFixed(2)} dari sales yang tidak terdeteksi!`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
