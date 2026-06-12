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
    console.log('[POST /api/sessions] ⏰ Request received at', new Date().toISOString());
    
    const body = await request.json();
    const { outlet_id, date, opening_cash } = body;
    console.log('[POST /api/sessions] 📝 Payload:', { outlet_id, date, opening_cash });

    if (!outlet_id || !date || opening_cash === undefined) {
      console.warn('[POST /api/sessions] ❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Check if session already exists for this date with OPEN status
    console.log('[POST /api/sessions] 🔍 Checking for existing open session...');
    const { data: existing } = await supabase.from('daily_sessions')
      .select('id')
      .eq('outlet_id', outlet_id)
      .eq('date', date)
      .eq('status', 'open')
      .single();

    if (existing) {
      console.warn('[POST /api/sessions] ⚠️ Session already exists:', existing.id);
      return NextResponse.json(
        { error: 'Sesi sudah terbuka untuk tanggal ini' },
        { status: 409 }
      );
    }

    // Find the current period for this outlet
    console.log('[POST /api/sessions] 🔍 Finding active period for outlet:', outlet_id);
    const { data: period } = await supabase
      .from('periods')
      .select('id, is_locked')
      .eq('outlet_id', outlet_id)
      .eq('status', 'active')
      .single();

    // Check if period is locked
    if (period?.is_locked) {
      console.warn('[POST /api/sessions] 🔒 Period is locked');
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
    console.log('[POST /api/sessions] 💾 About to insert session:', insertData);

    const { data, error } = await (supabase.from('daily_sessions') as any)
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/sessions] 💥 Insert error:', error);
      throw error;
    }

    console.log('[POST /api/sessions] ✅ Created session:', data?.id, 'at', new Date().toISOString());
    
    // Return session directly (standardized response format)
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/sessions] 💥 Unhandled error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
