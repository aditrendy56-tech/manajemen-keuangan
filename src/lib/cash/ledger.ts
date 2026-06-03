import { getSupabaseServer } from '@/lib/supabase/server';

export async function recordCashTransaction(payload: {
  outlet_id: string;
  transaction_date: string;
  transaction_type: 'inflow' | 'outflow';
  source_type: 'sale' | 'sale_settlement' | 'sale_refund' | 'expense' | 'expense_settlement' | 'expense_refund' | 'material_purchase' | 'capital_entry' | 'profit_allocation' | 'repayment' | 'manual';
  source_id?: string | null;
  amount: number;
  description: string;
  notes?: string | null;
}) {
  const supabase = await getSupabaseServer();
  const { error } = await (supabase.from('cash_transactions') as any).insert([payload]);
  if (error) throw error;
}

export async function deleteCashTransactionsBySource(sourceType: string, sourceId: string) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('cash_transactions')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  if (error) throw error;
}
