-- ========================================
-- CLEANUP SCRIPT: Delete Demo Data (Fresh Start)
-- Purpose: Remove all existing demo data before fresh input with new system
-- Date: 2026-06-07
-- ========================================

-- STEP 1: Check what we're about to delete
-- Uncomment to preview what will be deleted:
/*
SELECT COUNT(*) as total_expenses FROM expenses 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000';

SELECT COUNT(*) as total_capital_entries FROM capital_entries 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000';

SELECT COUNT(*) as total_capital_repayments FROM capital_repayments 
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);
*/

-- STEP 2: Delete expenses (demo data - fresh start)
DELETE FROM expenses 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000';

-- STEP 3: Delete capital_entries (demo data - fresh start)
DELETE FROM capital_entries 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000';

-- STEP 4: Delete capital_repayments linked to demo investors
DELETE FROM capital_repayments 
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);

-- STEP 5: Verify deletion
SELECT COUNT(*) as remaining_expenses FROM expenses 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000';

SELECT COUNT(*) as remaining_capital_entries FROM capital_entries 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000';

SELECT COUNT(*) as remaining_capital_repayments FROM capital_repayments 
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);

-- Expected: all should return 0

-- ========================================
-- SCHEMA VERIFICATION
-- ========================================

-- Verify new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND column_name IN ('funding_source', 'funded_by_investor_id');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'capital_repayments' 
  AND column_name IN ('repayment_type', 'remaining_modal');

-- ========================================
-- CLEANUP COMPLETE
-- Ready for fresh data input with new system!
-- ========================================
