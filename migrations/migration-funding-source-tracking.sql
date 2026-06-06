-- ========================================
-- MIGRATION: Add Funding Source Tracking
-- Purpose: Track whether expense paid from sales revenue (kas) or investor capital (modal)
-- Date: 2026-06-07
-- ========================================

-- Add funding_source column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS funding_source VARCHAR(50) DEFAULT 'kas'
  CHECK (funding_source IN ('kas', 'modal'));

-- Add funded_by_investor_id column to link to investors table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS funded_by_investor_id UUID REFERENCES investors(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN expenses.funding_source IS 
  'Track expense source: kas (from sales revenue) or modal (from investor capital)';

COMMENT ON COLUMN expenses.funded_by_investor_id IS 
  'Links to investors table when funding_source=modal. NULL when funding_source=kas';

-- Add repayment_type to capital_repayments table (for cicil vs lunas tracking)
ALTER TABLE capital_repayments 
ADD COLUMN IF NOT EXISTS repayment_type VARCHAR(50) DEFAULT 'lunas'
  CHECK (repayment_type IN ('lunas', 'cicil'));

-- Add remaining_modal to track pending modal after partial repayment
ALTER TABLE capital_repayments 
ADD COLUMN IF NOT EXISTS remaining_modal DECIMAL(15, 2);

COMMENT ON COLUMN capital_repayments.repayment_type IS 
  'Type of repayment: lunas (full) or cicil (partial)';

COMMENT ON COLUMN capital_repayments.remaining_modal IS 
  'Amount of modal still pending after this repayment (only if cicil)';

-- ========================================
-- RLS Policies (if not already exist)
-- ========================================

-- Keep existing RLS on expenses
-- Keep existing RLS on capital_repayments

-- ========================================
-- Migration Complete
-- ========================================
-- All existing expenses will get funding_source='kas' by DEFAULT
-- Manual review required for expenses that should be funding_source='modal'
--
-- Next step: Run cleanup script to:
-- 1. Delete all existing demo expenses (fresh start)
-- 2. Delete all existing demo capital_entries
-- 3. Verify schema
