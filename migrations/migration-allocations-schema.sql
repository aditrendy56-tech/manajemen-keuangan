-- ========================================
-- ALLOCATION / STAKEHOLDER SCHEMA
-- Run this in Supabase SQL Editor after the main schema exists
-- ========================================

-- Stakeholders: founder, investor, employee, etc.
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'founder' | 'investor' | 'employee' | 'other'
  investor_id UUID, -- optional reference to investors table
  default_share_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stakeholders_all" ON stakeholders FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_stakeholders_outlet ON stakeholders(outlet_id);

-- Allocation rules (default or per-period overrides)
CREATE TABLE IF NOT EXISTS allocation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255),
  recover_first BOOLEAN DEFAULT true,
  cash_reserve_percent DECIMAL(5,2) DEFAULT 10,
  allow_overdraft BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE allocation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocation_rules_all" ON allocation_rules FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_allocation_rules_outlet ON allocation_rules(outlet_id);

-- Allocation runs (each execution / dry-run)
CREATE TABLE IF NOT EXISTS allocation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES allocation_rules(id) ON DELETE SET NULL,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  run_by VARCHAR(255),
  status VARCHAR(20) DEFAULT 'dry', -- 'dry' | 'executed'
  total_profit DECIMAL(15,2) DEFAULT 0,
  total_allocated DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE allocation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocation_runs_all" ON allocation_runs FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_allocation_runs_outlet_period ON allocation_runs(outlet_id, period_year, period_month);

-- Allocation items (breakdown per stakeholder or pool)
CREATE TABLE IF NOT EXISTS allocation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  allocation_run_id UUID NOT NULL REFERENCES allocation_runs(id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  item_type VARCHAR(50) NOT NULL, -- 'reserve' | 'founder' | 'employee' | 'capital_recovery' | 'pool' | 'other'
  amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE allocation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocation_items_all" ON allocation_items FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_allocation_items_run ON allocation_items(allocation_run_id);

-- Profit shares could be managed via stakeholders.default_share_percent; keep table for history if needed
CREATE TABLE IF NOT EXISTS profit_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  percent DECIMAL(5,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE profit_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profit_shares_all" ON profit_shares FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_profit_shares_stakeholder ON profit_shares(stakeholder_id);

-- ensure indexes
CREATE INDEX IF NOT EXISTS idx_stakeholders_role ON stakeholders(role);

-- End of allocation schema
