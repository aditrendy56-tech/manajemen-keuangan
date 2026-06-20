export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('outlets')
      .select('id, business_id, name, location, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data);
    }

    return NextResponse.json([
      {
        id: 'default-outlet',
        business_id: 'default-business',
        name: 'Outlet Utama',
        location: 'Jakarta',
        created_at: new Date().toISOString(),
      },
    ]);
  } catch {
    // Keep the app usable even when the database is empty or not seeded yet.
    // Real outlet rows from the database still take precedence when they exist.
    return NextResponse.json([
      {
        id: 'default-outlet',
        business_id: 'default-business',
        name: 'Outlet Utama',
        location: 'Jakarta',
        created_at: new Date().toISOString(),
      },
    ]);
  }
}