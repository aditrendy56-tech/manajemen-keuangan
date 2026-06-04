export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, recover_first, cash_reserve_percent, allow_overdraft, notes } = body;

    const update = {
      name,
      recover_first: recover_first === undefined ? undefined : Boolean(recover_first),
      cash_reserve_percent: cash_reserve_percent !== undefined ? Number(cash_reserve_percent) : undefined,
      allow_overdraft: allow_overdraft === undefined ? undefined : Boolean(allow_overdraft),
      notes,
    };

    const updateData = Object.fromEntries(Object.entries(update).filter(([_, v]) => v !== undefined));

    const { data, error } = await (getSupabaseServer().from('allocation_rules') as any).update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await getSupabaseServer().from('allocation_rules').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
