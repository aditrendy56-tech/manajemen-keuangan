-- Migration: Add online sales fee analysis columns
-- Date: 2026-06-13
-- Purpose: Support calculated_total, fee_amount, fee_percentage for online sales gap analysis

ALTER TABLE IF EXISTS sales
ADD COLUMN IF NOT EXISTS calculated_total NUMERIC NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC NULL DEFAULT NULL;

COMMENT ON COLUMN sales.calculated_total IS 'Calculated total from item prices (used for online sales fee analysis)';
COMMENT ON COLUMN sales.fee_amount IS 'Fee/gap amount between calculated_total and net_amount (used for online sales fee analysis)';
COMMENT ON COLUMN sales.fee_percentage IS 'Fee percentage calculated as (fee_amount / calculated_total) * 100';

-- Index untuk query fee analysis
CREATE INDEX IF NOT EXISTS idx_sales_calculated_total ON sales(calculated_total) WHERE calculated_total IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_fee_amount ON sales(fee_amount) WHERE fee_amount IS NOT NULL;
