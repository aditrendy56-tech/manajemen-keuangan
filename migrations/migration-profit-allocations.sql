-- ========================================
-- PROFIT ALLOCATION SYSTEM SETUP
-- Run this in Supabase SQL Editor after the main schema exists
-- ========================================

CREATE TABLE IF NOT EXISTS profit_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  allocation_date DATE NOT NULL,
  period_label VARCHAR(100),
  total_profit DECIMAL(15, 2) NOT NULL,
  reserve_amount DECIMAL(15, 2) DEFAULT 0,
  distributed_amount DECIMAL(15, 2) DEFAULT 0,
  allocation_mode VARCHAR(50) DEFAULT 'retain',
  reserve_label VARCHAR(255),
  distribution_label VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE profit_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profit_allocations_all" ON profit_allocations FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_profit_allocations_outlet ON profit_allocations(outlet_id);
CREATE INDEX IF NOT EXISTS idx_profit_allocations_date ON profit_allocations(allocation_date);
