export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getSupabaseServer()
      .from('outlets')
      .select('id, business_id, name, location, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}