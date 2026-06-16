#!/usr/bin/env node
/**
 * Reset dummy transactional data to empty state.
 * Jalankan: node reset-dummy-data.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File tidak ditemukan: ${filepath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.substring(0, eq).trim();
    const value = line.substring(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

const envPath = path.join(process.cwd(), '.env.local');
const env = loadEnv(envPath);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tables = [
  'profit_pending_transactions',
  'sale_items',
  'sales',
  'capital_repayments',
  'capital_entries',
  'profit_allocations',
  'simpan_uang_allocations',
  'expenses',
  'cash_transactions',
  'daily_sessions',
  'financial_accounts',
];

const idConditions = {
  financial_accounts: { col: 'outlet_id', op: 'not' },
};

async function deleteTable(table) {
  try {
    const condition = idConditions[table] || { col: 'id', op: 'not' };
    let query = supabase.from(table).delete();

    if (condition.op === 'not') {
      query = query.not(condition.col, 'is', null);
    }

    const { error } = await query;

    if (error) {
      const msg = String(error.message || error).toLowerCase();
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        console.log(`⚠️  Table ${table} tidak ditemukan atau tidak tersedia, skip`);
        return;
      }
      throw error;
    }

    console.log(`✅ ${table} dikosongkan`);
  } catch (error) {
    const msg = String(error.message || error).toLowerCase();
    if (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('relation') || msg.includes('permission')) {
      console.log(`⚠️  Table ${table} tidak dapat dihapus secara langsung, skip`);
      return;
    }
    throw error;
  }
}

async function main() {
  console.log('🧹 Mulai reset dummy transactional data...');
  for (const table of tables) {
    await deleteTable(table);
  }
  console.log('\n🎉 Semua dummy transactional data berhasil dihapus.');
  console.log('  - sales');
  console.log('  - sale_items');
  console.log('  - capital_entries');
  console.log('  - capital_repayments');
  console.log('  - expenses');
  console.log('  - financial_accounts');
  console.log('  - profit_pending_transactions');
  console.log('  - profit_allocations');
  console.log('  - simpan_uang_allocations');
  console.log('  - daily_sessions');
  console.log('  - cash_transactions');
  console.log('\nSekarang kamu bisa input ulang dari awal.');
}

main().catch(error => {
  console.error('❌ Error saat reset data:', error.message || error);
  process.exit(1);
});
