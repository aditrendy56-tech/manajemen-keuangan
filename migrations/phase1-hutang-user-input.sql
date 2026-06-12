-- PHASE 1: Add user input untuk Hutang Status
-- Purpose: Allow users to choose FULL_PAYMENT vs CICILAN when entering capital
-- Date: 2026-06-12

-- 1. Add columns ke capital_entries untuk track hutang type & cicilan amount
ALTER TABLE capital_entries 
ADD COLUMN hutang_status VARCHAR(20) DEFAULT 'cicilan' CHECK (hutang_status IN ('full_payment', 'cicilan')),
ADD COLUMN cicilan_amount INTEGER,
ADD COLUMN cicilan_start_date DATE,
ADD COLUMN cicilan_months INTEGER;

-- 2. Update existing capital_entries to CICILAN (backward compatibility)
UPDATE capital_entries 
SET hutang_status = 'cicilan' 
WHERE hutang_status IS NULL OR hutang_status = 'cicilan';

-- 3. Add tracking columns untuk input audit trail
ALTER TABLE capital_entries 
ADD COLUMN hutang_status_set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN hutang_status_set_by VARCHAR(255);

-- 4. Add comments to columns (PostgreSQL syntax)
COMMENT ON COLUMN capital_entries.cicilan_amount IS 'Monthly installment amount (if hutang_status = cicilan)';
COMMENT ON COLUMN capital_entries.cicilan_start_date IS 'Start date for monthly installment';
COMMENT ON COLUMN capital_entries.cicilan_months IS 'Total months for cicilan (if known)';
COMMENT ON COLUMN capital_entries.hutang_status IS 'User-selected hutang type: full_payment or cicilan';
COMMENT ON COLUMN capital_entries.hutang_status_set_at IS 'Timestamp when hutang status was set';
COMMENT ON COLUMN capital_entries.hutang_status_set_by IS 'User/system that set the hutang status';

-- 5. Create index for faster hutang status queries
CREATE INDEX idx_capital_entries_hutang_status 
ON capital_entries(investor_id, hutang_status);

-- Verify schema update
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'capital_entries' 
AND column_name IN ('hutang_status', 'cicilan_amount', 'cicilan_start_date', 'cicilan_months')
ORDER BY ordinal_position;
