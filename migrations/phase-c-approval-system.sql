-- ========================================
-- Phase C: PROFIT ALLOCATION APPROVAL SYSTEM
-- Add approval workflow + amendment tracking
-- ========================================

-- Add approval columns to profit_allocations
ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'amended', 'executed'));

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS amendment_reason TEXT;

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS amended_from_allocation_id UUID REFERENCES profit_allocations(id);

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS profit_share_breakdown JSONB
  COMMENT 'Breakdown of profit shares per investor (LUNAS only): [{investor_id, investor_name, share_amount}]';

-- Add comments
COMMENT ON COLUMN profit_allocations.approval_status IS
  'Workflow status: draft -> pending_approval -> approved -> executed (or amended for corrections)';

COMMENT ON COLUMN profit_allocations.approved_by IS
  'User email/ID who approved the allocation';

COMMENT ON COLUMN profit_allocations.profit_share_breakdown IS
  'JSON array showing how profit was divided among LUNAS investors: [{investor_id, investor_name, share_percent, share_amount}]';

-- Create indexes for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_profit_allocations_approval_status 
  ON profit_allocations(outlet_id, approval_status, allocation_date DESC);

CREATE INDEX IF NOT EXISTS idx_profit_allocations_amended_from 
  ON profit_allocations(amended_from_allocation_id);
