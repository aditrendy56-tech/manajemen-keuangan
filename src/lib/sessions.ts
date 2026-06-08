import { getSupabaseServer } from '@/lib/supabase/server';

type ResolveOpts = {
  sessionId?: string | null;
  outletId?: string | null;
  date?: string | null; // YYYY-MM-DD or any parsable date
  autoCreate?: boolean;
};

export async function resolveSessionForTransaction(opts: ResolveOpts) {
  const { sessionId, outletId, date, autoCreate = false } = opts || {};
  const supabase = await getSupabaseServer();

  try {
    if (sessionId) {
      const { data, error } = await supabase.from('daily_sessions').select('*').eq('id', sessionId).maybeSingle();
      if (error) throw error;
      return data || null;
    }

    if (!outletId) return null;

    const targetDate = date
      ? new Date(date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // try find FIRST open session for outlet+date (prevent duplicates)
    let { data: found, error: findErr } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('date', targetDate)
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findErr) {
      // some DBs may not have the column yet; bubble error to caller
      throw findErr;
    }

    if (found && found.id) return found;

    if (!autoCreate) return null;

    // create a new open session for that outlet/date with 0 opening cash
    // use insert with onConflict to prevent race conditions
    const insertPayload = {
      outlet_id: outletId,
      date: targetDate,
      opening_cash: 0,
      status: 'open',
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('daily_sessions')
      .insert([insertPayload])
      .select()
      .maybeSingle();

    if (insertErr) {
      // If we get conflict/duplicate error, try to find and return the existing one
      if (insertErr.code === '23505') {
        // Unique constraint violation - try to fetch the existing session
        const { data: existing } = await supabase
          .from('daily_sessions')
          .select('*')
          .eq('outlet_id', outletId)
          .eq('date', targetDate)
          .eq('status', 'open')
          .limit(1)
          .maybeSingle();
        return existing || null;
      }
      throw insertErr;
    }

    return inserted || null;
  } catch (err) {
    console.error('resolveSessionForTransaction error:', err);
    return null;
  }
}

export default resolveSessionForTransaction;
