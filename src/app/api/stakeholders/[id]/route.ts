export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, role, investor_id, default_share_percent, is_active, notes } = body;

    const update = {
      name,
      role,
      investor_id: investor_id || null,
      default_share_percent: default_share_percent !== undefined ? Number(default_share_percent) : undefined,
      is_active: is_active === undefined ? undefined : Boolean(is_active),
      notes,
    };

    const { data, error } = await getSupabaseServer().from('stakeholders').update(update).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await getSupabaseServer().from('stakeholders').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
