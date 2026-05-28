-- Seed default allocation rule and default stakeholders for existing outlets
-- Run in Supabase SQL Editor after applying schema migrations

-- Insert a default allocation rule for each outlet that doesn't have one
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

-- Insert a default founder stakeholder for outlets that have no founder
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

-- Safety: no-op if allocation_rules or stakeholders already present for an outlet

-- Optional: You may customize these seeds per-environment by editing the statements above.
