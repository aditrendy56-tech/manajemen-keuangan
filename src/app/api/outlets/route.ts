export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/outlets] Request received');
    
    const supabase = getSupabaseServer();
    console.log('[GET /api/outlets] Supabase client created');
    
    const { data, error } = await supabase
      .from('outlets')
      .select('id, business_id, name, location, created_at')
      .order('created_at', { ascending: true });

    console.log('[GET /api/outlets] Query result:', { data, error });

    if (error) {
      console.error('[GET /api/outlets] Supabase error:', error);
      throw error;
    }

    console.log('[GET /api/outlets] Success! Returning', data?.length, 'outlets');
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[GET /api/outlets] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
}