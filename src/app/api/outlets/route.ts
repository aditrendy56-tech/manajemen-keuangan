export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('outlets')
      .select('id, business_id, name, location, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch outlets';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}