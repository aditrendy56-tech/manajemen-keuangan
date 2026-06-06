export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function getRecognizedExpenseAmount(expense: any) {
  const amount = Number(expense.amount || 0);
  const refundAmount = Number(expense.refund_amount || 0);
  return Math.max(amount - refundAmount, 0);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const category = searchParams.get('category');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!outletId || !category) {
      return NextResponse.json({ error: 'outlet_id and category required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Get expenses for specific category on specific date
    const { data: expenses, error } = await supabase.from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by category (case-insensitive) and calculate amounts
    const categoryExpenses = (expenses || [])
      .filter((e: any) => (e.category || '').toLowerCase() === category.toLowerCase())
      .map((e: any) => ({
        id: e.id,
        amount: getRecognizedExpenseAmount(e),
        category: e.category,
        description: e.description || '',
        notes: e.notes || '',
        payment_status: e.payment_status,
        created_at: e.created_at,
        raw_material: e.raw_material || '',
        supplier: e.supplier || '',
        delivery_date: e.delivery_date || '',
      }));

    const total = categoryExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    return NextResponse.json({
      category,
      date,
      total,
      count: categoryExpenses.length,
      expenses: categoryExpenses,
    });
  } catch (error: any) {
    console.error('Error fetching expense details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
