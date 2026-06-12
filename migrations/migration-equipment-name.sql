-- Migration: Add equipment_name field for peralatan category
-- Date: 2026-06-13
-- Purpose: Add dedicated field for equipment/alat name for better data structure
--          and correlation with sourcing page equipment tracking

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS equipment_name VARCHAR(255);

COMMENT ON COLUMN expenses.equipment_name IS 
  'Equipment/alat name for category=peralatan. When category=peralatan, this field should be populated instead of relying on description only';

-- Create index for equipment tracking queries
CREATE INDEX IF NOT EXISTS idx_expenses_equipment_category 
  ON expenses(outlet_id, category, equipment_name) 
  WHERE category = 'peralatan';
