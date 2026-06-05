-- Migration: Add audit trail to capital_entries table
-- Purpose: Track when capital entries are edited and why, with original values
-- Status: Ready to apply

-- Add audit trail columns to capital_entries
ALTER TABLE capital_entries 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS edit_reason TEXT,
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS original_date DATE,
ADD COLUMN IF NOT EXISTS original_notes TEXT,
ADD COLUMN IF NOT EXISTS original_source VARCHAR(255);

-- Add comment to explain the audit trail
COMMENT ON COLUMN capital_entries.edited_at IS 'Timestamp when the entry was last edited';
COMMENT ON COLUMN capital_entries.edit_reason IS 'Reason for edit (e.g., kesalahan ketik/typo)';
COMMENT ON COLUMN capital_entries.original_amount IS 'Original amount before edit (for audit trail)';
COMMENT ON COLUMN capital_entries.original_date IS 'Original date before edit (for audit trail)';
COMMENT ON COLUMN capital_entries.original_notes IS 'Original notes before edit (for audit trail)';
COMMENT ON COLUMN capital_entries.original_source IS 'Original source before edit (for audit trail)';

-- Create index for finding edited entries
CREATE INDEX IF NOT EXISTS idx_capital_entries_edited_at 
ON capital_entries(outlet_id, edited_at DESC) 
WHERE edited_at IS NOT NULL;

-- ✅ Done! capital_entries sekarang support audit trail untuk edit tracking
