import { getSupabaseServer } from '@/lib/supabase/server';

export async function computeAllocationPreview(outletId: string, month: number, year: number, rule: any) {
  const { data: reportRes, error: reportErr } = await getSupabaseServer()
    .rpc('get_profit_for_period', { outlet_id: outletId, month_param: month, year_param: year })
    .catch((e) => ({ data: null, error: e }));

  // Fallback: use reports/summary endpoint server-side instead of rpc if not available
  let totalProfit = 0;
  try {
    if (reportErr || !reportRes) {
      // call existing report endpoint via internal fetch
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = new Date(year, month, 0).toISOString().slice(0,10);
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/reports/summary?outlet_id=${outletId}&start_date=${start}&end_date=${end}`);
      const json = await res.json();
      totalProfit = json?.report?.net_profit || 0;
    } else {
      totalProfit = Number(reportRes) || 0;
    }
  } catch (err) {
    totalProfit = 0;
  }

  // load stakeholders
  const { data: stakeholders } = await getSupabaseServer().from('stakeholders').select('*').eq('outlet_id', outletId).eq('is_active', true);
  const shares = stakeholders || [];

  // compute reserve
  const reservePercent = rule?.cash_reserve_percent ?? 10;
  const reserveAmount = (Number(totalProfit) * Number(reservePercent)) / 100;

  // compute recovery (simplified: check investors outstanding)
  let remainingAfterReserve = Number(totalProfit) - reserveAmount;
  let capitalRecovery = 0;
  const recoveryItems: any[] = [];
  if (rule?.recover_first) {
    // find investors with remaining_balance
    const { data: investors } = await getSupabaseServer().from('investors').select('*').eq('outlet_id', outletId).order('created_at', { ascending: true });
    let toRecover = remainingAfterReserve;
    for (const inv of investors || []) {
      if (toRecover <= 0) break;
      const outstanding = Number(inv.remaining_balance || 0);
      if (outstanding <= 0) continue;
      const take = Math.min(outstanding, toRecover);
      recoveryItems.push({ investor_id: inv.id, amount: take });
      capitalRecovery += take;
      toRecover -= take;
    }
    remainingAfterReserve = remainingAfterReserve - capitalRecovery;
  }

  const distributable = Math.max(0, remainingAfterReserve);

  // allocate by stakeholder shares (use default_share_percent)
  const allocations: any[] = [];
  const totalShare = shares.reduce((s: number, st: any) => s + Number(st.default_share_percent || 0), 0) || 0;
  if (totalShare > 0) {
    for (const st of shares) {
      const pct = Number(st.default_share_percent || 0);
      const amt = totalShare > 0 ? (distributable * pct) / totalShare : 0;
      allocations.push({ stakeholder_id: st.id, name: st.name, role: st.role, percent: pct, amount: amt });
    }
  }

  const preview = {
    total_profit: Number(totalProfit),
    reserve_amount: reserveAmount,
    capital_recovery: capitalRecovery,
    distributable,
    allocations,
    recovery_items: recoveryItems,
  };

  return preview;
}

export async function executeAllocation(outletId: string, month: number, year: number, rule: any, runBy: string | null) {
  const supabase = getSupabaseServer();
  const preview = await computeAllocationPreview(outletId, month, year, rule);

  // check idempotency
  const { data: existing } = await supabase.from('allocation_runs').select('*').eq('outlet_id', outletId).eq('period_month', month).eq('period_year', year).eq('status', 'executed').limit(1);
  if (existing && existing.length > 0) {
    throw new Error('Allocation for this period already executed');
  }

  // create allocation_run
  const { data: runData, error: runErr } = await supabase.from('allocation_runs').insert([{
    outlet_id: outletId,
    rule_id: rule?.id || null,
    period_month: month,
    period_year: year,
    run_by: runBy || null,
    status: 'executed',
    total_profit: preview.total_profit,
    total_allocated: preview.reserve_amount + preview.capital_recovery + preview.allocations.reduce((s:any,a:any)=>s+Number(a.amount||0),0),
  }]).select().single();

  if (runErr) throw runErr;

  const runId = runData.id;

  // create allocation_items for reserve
  const items: any[] = [];
  if (preview.reserve_amount > 0) {
    items.push({ allocation_run_id: runId, item_type: 'reserve', amount: preview.reserve_amount, notes: 'Reserve kas' });
  }

  // capital recovery items
  for (const r of preview.recovery_items || []) {
    items.push({ allocation_run_id: runId, item_type: 'capital_recovery', stakeholder_id: null, amount: r.amount, notes: `Recover investor ${r.investor_id}` });
  }

  // stakeholder allocations
  for (const a of preview.allocations || []) {
    items.push({ allocation_run_id: runId, stakeholder_id: a.stakeholder_id, item_type: a.role, amount: a.amount, notes: `Allocation ${a.percent}%` });
  }

  // insert allocation items
  const { data: itemData, error: itemErr } = await supabase.from('allocation_items').insert(items).select();
  if (itemErr) throw itemErr;

  // create cash_transactions for each item that affects cash (reserve, capital_recovery, allocations)
  const txs: any[] = [];
  for (const it of itemData) {
    const description = `Allocation - ${it.item_type}`;
    // Determine transaction_type: reserve and allocations -> outflow, capital_recovery -> outflow to investor
    txs.push({
      outlet_id: outletId,
      transaction_date: new Date().toISOString().slice(0,10),
      transaction_type: 'outflow',
      source_type: 'allocation',
      source_id: runId,
      amount: it.amount,
      description,
    });
  }

  if (txs.length > 0) {
    const { data: txRes, error: txErr } = await supabase.from('cash_transactions').insert(txs).select();
    if (txErr) throw txErr;
  }

  // update investors remaining_balance for recovery
  for (const r of preview.recovery_items || []) {
    if (!r.investor_id) continue;
    const { data: inv, error: invErr } = await supabase.from('investors').select('*').eq('id', r.investor_id).limit(1).single();
    if (invErr) continue;
    const newRem = Math.max(0, Number(inv.remaining_balance || 0) - Number(r.amount || 0));
    await supabase.from('investors').update({ remaining_balance: newRem }).eq('id', r.investor_id);
  }

  return { run: runData, items: itemData };
}
