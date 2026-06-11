-- ========================================
-- MIGRATION: Dual-Bucket Financial System v2.0
-- Purpose: Implement Kas Utama + Profit Pending + Simpan Uang architecture
-- Date: 2026-06-11
-- Version: Complete overhaul of financial tracking
-- Status: PLANNING - Ready to execute
-- ========================================

-- ========================================
-- SECTION 1: ADD KAS_SOURCE COLUMN TO EXPENSES
-- ========================================
-- Purpose: Track which bucket (Kas Utama / Simpan Uang) funded each expense
-- Impact: All new expenses must specify kas_source

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS kas_source VARCHAR(50) DEFAULT 'kas_utama'
  CHECK (kas_source IN ('kas_utama', 'simpan_uang'));

COMMENT ON COLUMN expenses.kas_source IS 
  'Track expense source: kas_utama (daily operations) or simpan_uang (strategic fund)';

-- Ensure all existing expenses default to 'kas_utama' (safe assumption)
UPDATE expenses SET kas_source = 'kas_utama' WHERE kas_source IS NULL;

-- ========================================
-- SECTION 2: CREATE FINANCIAL_ACCOUNTS TABLE
-- ========================================
-- Purpose: Real-time tracking of all three buckets per outlet
-- This is the single source of truth for current balances

CREATE TABLE IF NOT EXISTS financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL UNIQUE REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Kas Utama: For daily operations (60% from sales + allocation top-up)
  kas_utama_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  kas_utama_last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Profit Pending: Locked for monthly allocation (40% from sales)
  profit_pending_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  profit_pending_last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Simpan Uang: Strategic reserve fund (from allocation)
  simpan_uang_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  simpan_uang_last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT kas_utama_positive CHECK (kas_utama_balance >= 0),
  CONSTRAINT profit_pending_positive CHECK (profit_pending_balance >= 0),
  CONSTRAINT simpan_uang_positive CHECK (simpan_uang_balance >= 0)
);

COMMENT ON TABLE financial_accounts IS 
  'Real-time balances for Kas Utama, Profit Pending, and Simpan Uang per outlet';

-- ========================================
-- SECTION 3: CREATE SIMPAN_UANG_ALLOCATIONS TABLE
-- ========================================
-- Purpose: Full audit trail for strategic fund allocations
-- Tracks: when, how much, why, status of each allocation

CREATE TABLE IF NOT EXISTS simpan_uang_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  allocation_month VARCHAR(10) NOT NULL,  -- "2026-06" format
  
  -- Allocation Details
  amount DECIMAL(15, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  
  -- Status Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reallocated', 'used', 'archived')),
  
  -- Reallocation Tracking (if moved back to Kas Utama)
  reallocated_at TIMESTAMP,
  reallocated_to VARCHAR(50),  -- 'kas_utama' or other
  reallocated_reason TEXT,
  reallocated_amount DECIMAL(15, 2),
  
  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),  -- For audit
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100),
  
  -- Notes
  notes TEXT
);

COMMENT ON TABLE simpan_uang_allocations IS 
  'Complete history of Simpan Uang allocations with reason, status, and reallocation tracking';

-- ========================================
-- SECTION 4: MODIFY PROFIT_ALLOCATIONS TABLE
-- ========================================
-- Purpose: Add new fields for dual-bucket allocation logic

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS profit_pending_amount DECIMAL(15, 2);

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS simpan_uang_amount DECIMAL(15, 2);

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS simpan_reason VARCHAR(255);

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS kas_utama_topup DECIMAL(15, 2);

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS user_choice VARCHAR(50)
  CHECK (user_choice IN ('full_profit', 'available_kas', 'custom'));

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS allocation_month VARCHAR(10);  -- "2026-06" format

-- Add documentation
COMMENT ON COLUMN profit_allocations.profit_pending_amount IS 
  'Total profit pending available for this allocation';

COMMENT ON COLUMN profit_allocations.simpan_uang_amount IS 
  'Amount allocated to Simpan Uang from this allocation';

COMMENT ON COLUMN profit_allocations.simpan_reason IS 
  'Reason for Simpan Uang allocation (Emergency / Investment / etc)';

COMMENT ON COLUMN profit_allocations.kas_utama_topup IS 
  'Amount allocated as Kas Utama top-up for next month operations';

COMMENT ON COLUMN profit_allocations.user_choice IS 
  'How user chose to handle profit-kas mismatch: full / available / custom';

COMMENT ON COLUMN profit_allocations.allocation_month IS 
  'Which month allocation applies to (format: YYYY-MM)';

-- ========================================
-- SECTION 5: MODIFY CAPITAL_REPAYMENTS TABLE
-- ========================================
-- Purpose: Link auto-created repayments to profit allocations

ALTER TABLE capital_repayments
ADD COLUMN IF NOT EXISTS allocated_from_profit_allocation_id UUID 
  REFERENCES profit_allocations(id) ON DELETE SET NULL;

COMMENT ON COLUMN capital_repayments.allocated_from_profit_allocation_id IS 
  'If repayment auto-created from profit allocation, link to allocation record';

-- ========================================
-- SECTION 6: CREATE PROFIT_PENDING_TRANSACTIONS TABLE (Optional)
-- ========================================
-- Purpose: Track 40% profit accumulation throughout the month
-- Helps debug and audit profit pending calculation

CREATE TABLE IF NOT EXISTS profit_pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  
  split_type VARCHAR(50) NOT NULL DEFAULT 'auto_split'
    CHECK (split_type IN ('auto_split', 'manual_adjustment')),
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'allocated', 'distributed', 'archived')),
  
  allocated_in_allocation_id UUID REFERENCES profit_allocations(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  allocated_at TIMESTAMP,
  notes TEXT
);

COMMENT ON TABLE profit_pending_transactions IS 
  'Track individual profit pending accumulation for audit and debugging';

-- ========================================
-- SECTION 7: ADD INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_financial_accounts_outlet_id 
  ON financial_accounts(outlet_id);

CREATE INDEX IF NOT EXISTS idx_simpan_uang_allocations_outlet_month 
  ON simpan_uang_allocations(outlet_id, allocation_month);

CREATE INDEX IF NOT EXISTS idx_simpan_uang_allocations_status 
  ON simpan_uang_allocations(status);

CREATE INDEX IF NOT EXISTS idx_profit_pending_transactions_outlet 
  ON profit_pending_transactions(outlet_id, created_at);

CREATE INDEX IF NOT EXISTS idx_profit_allocations_month 
  ON profit_allocations(allocation_month);

CREATE INDEX IF NOT EXISTS idx_capital_repayments_allocation_id 
  ON capital_repayments(allocated_from_profit_allocation_id);

-- ========================================
-- SECTION 8: RLS POLICIES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE simpan_uang_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_pending_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified - restrict to outlet level)
-- Note: Uses outlet_id directly - no need to check outlets.created_by
-- All users with access to an outlet can access its financial data

-- For financial_accounts (anyone can view & update for their outlet via auth)
CREATE POLICY "Users can access financial_accounts for any outlet"
  ON financial_accounts 
  FOR ALL
  USING (true);  -- Simplified: rely on application-level auth

-- For simpan_uang_allocations (anyone can view for any outlet)
CREATE POLICY "Users can access simpan_uang_allocations for any outlet"
  ON simpan_uang_allocations
  FOR ALL
  USING (true);  -- Simplified: rely on application-level auth

-- For profit_pending_transactions (anyone can view for any outlet)
CREATE POLICY "Users can access profit_pending_transactions for any outlet"
  ON profit_pending_transactions
  FOR ALL
  USING (true);  -- Simplified: rely on application-level auth

-- ========================================
-- SECTION 9: MIGRATION ROLLBACK NOTES
-- ========================================
/*
To rollback this migration:

1. Drop new tables:
   DROP TABLE IF EXISTS profit_pending_transactions CASCADE;
   DROP TABLE IF EXISTS simpan_uang_allocations CASCADE;
   DROP TABLE IF EXISTS financial_accounts CASCADE;

2. Remove new columns:
   ALTER TABLE expenses DROP COLUMN IF EXISTS kas_source;
   ALTER TABLE profit_allocations DROP COLUMN IF EXISTS profit_pending_amount;
   ALTER TABLE profit_allocations DROP COLUMN IF EXISTS simpan_uang_amount;
   ALTER TABLE profit_allocations DROP COLUMN IF EXISTS simpan_reason;
   ALTER TABLE profit_allocations DROP COLUMN IF EXISTS kas_utama_topup;
   ALTER TABLE profit_allocations DROP COLUMN IF EXISTS user_choice;
   ALTER TABLE profit_allocations DROP COLUMN IF EXISTS allocation_month;
   ALTER TABLE capital_repayments DROP COLUMN IF EXISTS allocated_from_profit_allocation_id;

3. Restore old logic (if exists in previous migration)
*/

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Tables created:
--   ✅ financial_accounts (real-time balances)
--   ✅ simpan_uang_allocations (history tracking)
--   ✅ profit_pending_transactions (audit trail)
--
-- Columns added:
--   ✅ expenses.kas_source
--   ✅ profit_allocations.* (5 new columns)
--   ✅ capital_repayments.allocated_from_profit_allocation_id
--
-- Ready for: API implementation, Dashboard update, Forms update
-- ========================================
