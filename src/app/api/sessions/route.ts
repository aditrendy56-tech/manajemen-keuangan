export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const periodId = searchParams.get('period_id'); // Optional: filter by period
    const limit = searchParams.get('limit') || '20';
    const showHistorical = searchParams.get('show_historical') === 'true'; // Optional: show locked sessions

    if (!outletId) {
      return NextResponse.json({ error: 'outlet_id required' }, { status: 400 });
    }

    let query = getSupabaseServer()
      .from('daily_sessions')
      .select('*')
      .eq('outlet_id', outletId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    // By default, only show unlocked (active) sessions
    if (!showHistorical) {
      query = query.eq('is_locked', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      sessions: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outlet_id, date, opening_cash } = body;

    if (!outlet_id || !date || opening_cash === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Check if session already exists for this date with OPEN status
    const { data: existing } = await supabase.from('daily_sessions')
      .select('id')
      .eq('outlet_id', outlet_id)
      .eq('date', date)
      .eq('status', 'open')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Sesi sudah terbuka untuk tanggal ini' },
        { status: 409 }
      );
    }

    // Find the current period for this outlet
    const { data: period } = await supabase
      .from('periods')
      .select('id, is_locked')
      .eq('outlet_id', outlet_id)
      .eq('status', 'active')
      .single();

    // Check if period is locked
    if (period?.is_locked) {
      return NextResponse.json(
        { 
          error: 'Periode sudah ditutup (tutup buku). Tidak bisa membuat sesi baru.',
          period_id: period.id,
        },
        { status: 403 }
      );
    }

    const insertData = {
      outlet_id,
      date,
      opening_cash,
      status: 'open',
      period_id: period?.id, // Auto-assign to current period
    };

    const { data, error } = await (supabase.from('daily_sessions') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      session: data,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
