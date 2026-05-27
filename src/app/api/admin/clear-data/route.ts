export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tables, outlet_id } = await request.json();

    if (!tables || !Array.isArray(tables)) {
      return NextResponse.json({ error: 'tables array required' }, { status: 400 });
    }

    const outletId = outlet_id || '660e8400-e29b-41d4-a716-446655440000';
    const results: any = {};

    for (const table of tables) {
      try {
        const { data, error } = await getSupabaseServer()
          .from(table)
          .delete()
          .eq('outlet_id', outletId);

        if (error) {
          results[table] = { success: false, error: error.message };
        } else {
          results[table] = { success: true, message: `Deleted from ${table}` };
        }
      } catch (tableError: any) {
        results[table] = { success: false, error: tableError.message };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
