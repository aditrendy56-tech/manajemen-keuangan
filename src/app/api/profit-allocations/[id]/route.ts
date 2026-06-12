export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/profit-allocations/[id]/approve
 * Approve a profit allocation
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, approved_by, approval_notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    if (action === 'approve') {
      if (!approved_by) {
        return NextResponse.json({ error: 'approved_by required' }, { status: 400 });
      }

      // Get current allocation
      const { data: allocation, error: getError } = await (supabase
        .from('profit_allocations') as any)
        .select('*')
        .eq('id', id)
        .single();

      if (getError || !allocation) {
        return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
      }

      // Only draft or pending_approval can be approved
      if (allocation.approval_status !== 'draft' && allocation.approval_status !== 'pending_approval') {
        return NextResponse.json(
          { error: `Cannot approve allocation with status: ${allocation.approval_status}` },
          { status: 400 }
        );
      }

      // Update approval
      const { data: updated, error: updateError } = await (supabase
        .from('profit_allocations') as any)
        .update({
          approval_status: 'approved',
          approved_by,
          approved_at: new Date().toISOString(),
          approval_notes: approval_notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Allocation approved successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await getSupabaseServer()
      .from('profit_allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
