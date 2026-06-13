export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { data, error } = await (getSupabaseServer() as any).from('allocation_runs').select('*').eq('id', id).limit(1).single();
    if (error) throw error;
    const { data: items } = await (getSupabaseServer() as any).from('allocation_items').select('*').eq('allocation_run_id', id).order('created_at', { ascending: true });
    return NextResponse.json({ run: data, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    // For safety, we won't auto-delete executed runs. Instead, mark as deleted or return error.
    const { data: run } = await (getSupabaseServer() as any).from('allocation_runs').select('*').eq('id', id).limit(1).single();
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (run.status === 'executed') return NextResponse.json({ error: 'Cannot delete executed run via API. Use manual reversal.' }, { status: 400 });
    const { error } = await (getSupabaseServer() as any).from('allocation_runs').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
