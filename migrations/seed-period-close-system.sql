-- ========================================
-- SEED DATA: Period Close System
-- Run AFTER migration-period-close-system.sql
-- ========================================

-- ================================================
-- SEED 1: Initial Period
-- ================================================
-- Creates the current month period for the latest outlet
INSERT INTO periods (
  outlet_id,
  period_month,
  period_start_date,
  period_end_date,
  status,
  is_locked,
  created_at
)
SELECT 
  o.id,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  '2026-06-06'::DATE,
  '2026-07-05'::DATE,
  'active',
  false,
  NOW()
FROM outlets o
WHERE o.id = (SELECT id FROM outlets ORDER BY created_at DESC LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM periods WHERE outlet_id = o.id AND period_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  );

-- ================================================
-- SEED 2: Initial Allocation Rule (60-40 baseline)
-- ================================================
-- Creates the default allocation rule for the latest outlet
INSERT INTO allocation_rules (
  outlet_id,
  kas_utama_percent,
  profit_pending_percent,
  effective_from_date,
  approved_by,
  reason
)
SELECT
  o.id,
  60.00,
  40.00,
  CURRENT_DATE,
  'system',
  'MVP baseline: 60% Kas Utama (operational), 40% Profit Pending'
FROM outlets o
WHERE o.id = (SELECT id FROM outlets ORDER BY created_at DESC LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM allocation_rules WHERE outlet_id = o.id
  );

-- ================================================
-- SEED 3: Link existing daily_sessions to periods
-- ================================================
-- Maps historical daily_sessions to their respective periods by month
UPDATE daily_sessions ds
SET period_id = p.id
FROM periods p
WHERE ds.outlet_id = p.outlet_id
  AND TO_CHAR(ds.date, 'YYYY-MM') = p.period_month
  AND ds.period_id IS NULL;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these to verify seeds executed correctly:

-- Check periods created
SELECT 'Periods created:' as check_name, COUNT(*) as record_count FROM periods;

-- Check allocation_rules created
SELECT 'Allocation rules created:' as check_name, COUNT(*) as record_count FROM allocation_rules;

-- Check daily_sessions linked to periods
SELECT 'Daily sessions linked to periods:' as check_name, COUNT(*) as record_count 
FROM daily_sessions 
WHERE period_id IS NOT NULL;
