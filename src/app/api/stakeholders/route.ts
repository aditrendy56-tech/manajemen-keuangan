export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const outletId = params.get('outlet_id');
    if (!outletId) return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    const { data, error } = await getSupabaseServer().from('stakeholders').select('*').eq('outlet_id', outletId).order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outlet_id, name, role, investor_id } = body;
    if (!outlet_id || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const insert = {
      outlet_id,
      name,
      role,
      investor_id: investor_id || null,
    };
    const { data, error } = await (getSupabaseServer().from('stakeholders') as any).insert([insert]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
