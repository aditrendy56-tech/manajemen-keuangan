-- ========================================
-- PERIOD CLOSE & ADAPTIVE ALLOCATION SYSTEM
-- Supports: Tutup Buku (5th of month) + Adaptive Strategy
-- Run this in Supabase SQL Editor
-- ========================================

-- =====================================
-- TABLE 1: periods (Period Management)
-- =====================================
CREATE TABLE IF NOT EXISTS periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Period definition
  period_month VARCHAR(7) NOT NULL,        -- "2026-06" (YYYY-MM)
  period_start_date DATE NOT NULL,         -- 2026-06-06
  period_end_date DATE NOT NULL,           -- 2026-07-05
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'closed'
  is_locked BOOLEAN DEFAULT false,         -- True after tutup buku
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,                     -- When closed
  closed_by VARCHAR,                       -- Who closed (user email/id)
  
  -- Constraints
  UNIQUE (outlet_id, period_month),
  CHECK (status IN ('active', 'closed')),
  CHECK (period_start_date < period_end_date)
);

ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "periods_all" ON periods;
CREATE POLICY "periods_all" ON periods FOR ALL USING (true);

-- ================================================
-- TABLE 2: allocation_rules (Versioned History)
-- ================================================
CREATE TABLE IF NOT EXISTS allocation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Rule definition
  kas_utama_percent DECIMAL(5, 2) NOT NULL,      -- e.g., 60.00 or 40.00
  profit_pending_percent DECIMAL(5, 2) NOT NULL, -- e.g., 40.00 or 60.00
  
  -- Temporal
  effective_from_date DATE NOT NULL,  -- When this rule starts
  effective_to_date DATE,             -- When this rule ended (NULL if current)
  is_current BOOLEAN DEFAULT true,
  
  -- Governance
  approved_by VARCHAR NOT NULL,
  approved_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,                        -- Why this rule chosen
  
  -- History tracking
  previous_rule_id UUID REFERENCES allocation_rules(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CHECK (kas_utama_percent + profit_pending_percent = 100),
  CHECK (effective_from_date IS NOT NULL),
  CHECK (effective_to_date IS NULL OR effective_from_date < effective_to_date)
);

-- Create indexes separately after table creation (to avoid timing issues)
-- CREATE INDEX idx_allocation_rules_effective ON allocation_rules(outlet_id, effective_from_date);

ALTER TABLE allocation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allocation_rules_all" ON allocation_rules;
CREATE POLICY "allocation_rules_all" ON allocation_rules FOR ALL USING (true);

-- =======================================
-- TABLE 3: buku_closings (Close Records)
-- =======================================
CREATE TABLE IF NOT EXISTS buku_closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  
  -- Financial recap
  total_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Sum of sesi harian
  total_sales_transactions INT DEFAULT 0,          -- Count of sesi
  
  actual_operational_spent DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Tracked spending
  allocated_operational_buffer DECIMAL(15, 2) DEFAULT 0,    -- 60% or new % of revenue
  variance DECIMAL(15, 2) DEFAULT 0,                        -- allocated - actual
  variance_percent DECIMAL(5, 2) DEFAULT 0,                 -- variance / revenue * 100
  
  -- Allocation processing
  total_cicilan_allocated DECIMAL(15, 2) DEFAULT 0,
  total_profit_allocated DECIMAL(15, 2) DEFAULT 0,
  total_employee_allocated DECIMAL(15, 2) DEFAULT 0,
  
  -- Decision point
  current_allocation_rule_id UUID REFERENCES allocation_rules(id),
  next_allocation_rule_id UUID REFERENCES allocation_rules(id),
  allocation_changed BOOLEAN DEFAULT false,
  change_reason TEXT,
  
  -- Metadata
  notes TEXT,
  closed_at TIMESTAMP DEFAULT NOW(),
  closed_by VARCHAR,
  
  -- Profit allocation status
  profit_allocation_processing_complete BOOLEAN DEFAULT false
);

ALTER TABLE buku_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buku_closings_all" ON buku_closings;
CREATE POLICY "buku_closings_all" ON buku_closings FOR ALL USING (true);

-- =========================================================
-- TABLE 4: Alter daily_sessions (Add Period Tracking)
-- =========================================================
ALTER TABLE daily_sessions 
ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS locked_by VARCHAR,
ADD COLUMN IF NOT EXISTS period_end_date DATE;

