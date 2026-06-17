#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filepath) {
  if (!fs.existsSync(filepath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filepath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (key && val) env[key] = val;
  }
  return env;
}

(async () => {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const outletId = '660e8400-e29b-41d4-a716-446655440000';
  const month = new Date().toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from('cash_transactions')
    .select('id, transaction_date, transaction_type, source_type, source_id, amount, description, notes')
    .eq('outlet_id', outletId)
    .eq('transaction_type', 'inflow')
    .gte('transaction_date', `${month}-01`)
    .lt('transaction_date', `${String(parseInt(month.split('-')[1]) + 1).padStart(2, '0')}-01`)
    .order('transaction_date', { ascending: false });

  console.log('ERROR', error);
  console.log('COUNT', data?.length || 0);
  console.log(JSON.stringify(data, null, 2));
})();
