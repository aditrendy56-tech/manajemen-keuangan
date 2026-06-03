-- ========================================
-- MIGRATION: Unified Funding Source System
-- Add source_type and notes to investors table
-- Allows tracking both owner and external investor sources
-- ========================================

-- Add columns to investors table
ALTER TABLE investors ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'investor';
ALTER TABLE investors ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing data to have source_type
UPDATE investors SET source_type = 'investor' WHERE source_type IS NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_investors_source_type ON investors(outlet_id, source_type);

-- ========================================
-- Data Migration Notes:
-- - All existing investors are marked as 'investor' type
-- - New entries can be 'owner' (internal owner contribution) or 'investor' (external investor)
-- - This enables unified management of all funding sources from the "Sumber Dana" (Funding Source) page
-- ========================================
