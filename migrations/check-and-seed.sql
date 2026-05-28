-- Check & Seed script for allocation schema
-- Safe to run multiple times. Run in Supabase SQL Editor (staging first).

-- 1) Check essential tables exist (returns table name or NULL)
SELECT to_regclass('public.stakeholders') AS stakeholders_exists;
SELECT to_regclass('public.allocation_rules') AS allocation_rules_exists;
SELECT to_regclass('public.allocation_runs') AS allocation_runs_exists;
SELECT to_regclass('public.allocation_items') AS allocation_items_exists;
SELECT to_regclass('public.profit_shares') AS profit_shares_exists;

-- 2) Check uuid extension availability
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto');

-- 3) Quick sample rows (show up to 5 rows if present)
SELECT * FROM allocation_rules ORDER BY created_at DESC LIMIT 5;
SELECT * FROM stakeholders ORDER BY created_at DESC LIMIT 5;

-- 4) Show policies for these tables (RLS)
SELECT * FROM pg_policies WHERE tablename IN ('stakeholders','allocation_rules','allocation_runs','allocation_items','profit_shares');

-- 5) Idempotent seed: insert default allocation rule and default founder if missing
-- (This is the same logic as seed-allocation-default.sql but included here for one-shot convenience)

-- Default allocation rule for outlets without one
INSERT INTO allocation_rules (outlet_id, name, recover_first, cash_reserve_percent, allow_overdraft, notes)
SELECT o.id,
       'Default Allocation Rule (balik modal, kas reserve 10%)',
       true,
       10,
       false,
       'Seeded default allocation rule: recover capital first, keep 10% cash reserve.'
FROM outlets o
WHERE NOT EXISTS (
  SELECT 1 FROM allocation_rules ar WHERE ar.outlet_id = o.id
);

-- Default founder stakeholder for outlets without one
INSERT INTO stakeholders (outlet_id, name, role, default_share_percent, notes)
SELECT o.id,
       'Founder',
       'founder',
       100,
       'Seeded default founder stakeholder'
FROM outlets o
WHERE NOT EXISTS (
  SELECT 1 FROM stakeholders s WHERE s.outlet_id = o.id AND s.role = 'founder'
);

-- 6) Verification queries after seed
SELECT COUNT(*) AS rules_count FROM allocation_rules;
SELECT COUNT(*) AS stakeholders_count FROM stakeholders;

-- End of script
