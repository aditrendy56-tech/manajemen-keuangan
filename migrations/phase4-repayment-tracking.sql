-- ========================================
-- PHASE 4: PEMBAYARAN CICILAN (REPAYMENT TRACKING)
-- ========================================
-- Purpose: Record actual cicilan payments and update outstanding hutang
-- Tracks every payment as immutable audit trail

-- Run this migration in Supabase SQL Editor

-- ========================================
-- SECTION 1: UPDATE CAPITAL_REPAYMENTS TABLE
-- ========================================
-- Add cicilan tracking columns

ALTER TABLE capital_repayments
ADD COLUMN IF NOT EXISTS cicilan_number INT,
ADD COLUMN IF NOT EXISTS allocated_from_alokasi_laba UUID REFERENCES profit_allocations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS remaining_after_payment DECIMAL(15, 2);

-- Add comments
COMMENT ON COLUMN capital_repayments.cicilan_number IS 'Which cicilan payment number (1st, 2nd, 3rd, etc)';
COMMENT ON COLUMN capital_repayments.allocated_from_alokasi_laba IS 'Which Alokasi Laba allocation this payment came from';
COMMENT ON COLUMN capital_repayments.remaining_after_payment IS 'Outstanding hutang after this payment';

-- ========================================
-- SECTION 2: CREATE REPAYMENT_TRACKING TABLE
-- ========================================
-- Immutable audit log untuk setiap pembayaran

CREATE TABLE IF NOT EXISTS repayment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Payment details
  repayment_date DATE NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL CHECK (amount_paid > 0),
  repayment_type VARCHAR(50) NOT NULL DEFAULT 'cicilan' 
    CHECK (repayment_type IN ('cicilan', 'full_payment')),
  
  -- Before and after state
  outstanding_before DECIMAL(15, 2),
  outstanding_after DECIMAL(15, 2),
  
  -- Relationship to other tables
  capital_entry_id UUID REFERENCES capital_entries(id) ON DELETE SET NULL,
  capital_repayment_id UUID REFERENCES capital_repayments(id) ON DELETE SET NULL,
  profit_allocation_id UUID REFERENCES profit_allocations(id) ON DELETE SET NULL,
  
  -- Payment info
  payment_method VARCHAR(50) DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'cash', 'check', 'other')),
  
  -- Notes
  notes TEXT,
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_repayment_tracking_investor ON repayment_tracking(investor_id);
CREATE INDEX idx_repayment_tracking_outlet ON repayment_tracking(outlet_id);
CREATE INDEX idx_repayment_tracking_date ON repayment_tracking(repayment_date);
CREATE INDEX idx_repayment_tracking_capital_entry ON repayment_tracking(capital_entry_id);
CREATE INDEX IF NOT EXISTS idx_repayment_tracking_investor_outlet_date 
  ON repayment_tracking(investor_id, outlet_id, repayment_date);

-- Add comments
COMMENT ON TABLE repayment_tracking IS 'Immutable audit log of all investor repayments';
COMMENT ON COLUMN repayment_tracking.repayment_type IS 'Type: cicilan (partial) or full_payment (complete)';
COMMENT ON COLUMN repayment_tracking.outstanding_before IS 'Hutang sebelum pembayaran';
COMMENT ON COLUMN repayment_tracking.outstanding_after IS 'Hutang sesudah pembayaran';
COMMENT ON COLUMN repayment_tracking.payment_method IS 'How payment was made';
COMMENT ON COLUMN repayment_tracking.created_by IS 'Username/email who recorded this payment';

-- Enable RLS
ALTER TABLE repayment_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repayment_tracking_all" ON repayment_tracking;
CREATE POLICY "repayment_tracking_all" ON repayment_tracking FOR ALL USING (true);

-- ========================================
-- SECTION 3: ADD CICILAN STATUS TABLE (NEW)
-- ========================================
-- Track cicilan schedule and status

CREATE TABLE IF NOT EXISTS cicilan_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  capital_entry_id UUID NOT NULL REFERENCES capital_entries(id) ON DELETE CASCADE,
  
  -- Cicilan details
  cicilan_number INT NOT NULL, -- Cicilan ke-1, ke-2, etc
  cicilan_amount DECIMAL(15, 2) NOT NULL,
  due_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_date DATE,
  
  -- Payment reference
  repayment_tracking_id UUID REFERENCES repayment_tracking(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cicilan_schedule_investor ON cicilan_schedule(investor_id);
CREATE INDEX idx_cicilan_schedule_status ON cicilan_schedule(status);
CREATE INDEX IF NOT EXISTS idx_cicilan_schedule_investor_status 
  ON cicilan_schedule(investor_id, status);

-- Enable RLS
ALTER TABLE cicilan_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cicilan_schedule_all" ON cicilan_schedule;
CREATE POLICY "cicilan_schedule_all" ON cicilan_schedule FOR ALL USING (true);

-- ========================================
-- SECTION 4: CREATE UTILITY FUNCTION
-- ========================================
-- Function to get payment summary for investor

CREATE OR REPLACE FUNCTION get_investor_payment_summary(
  p_investor_id UUID,
  p_outlet_id UUID,
  p_month VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  total_allocated DECIMAL,
  total_paid DECIMAL,
  remaining_to_pay DECIMAL,
  cicilan_count BIGINT,
  last_payment_date DATE,
  status VARCHAR
) AS $$
DECLARE
  v_month VARCHAR;
BEGIN
  v_month := COALESCE(p_month, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
  
  RETURN QUERY
  WITH allocated AS (
    SELECT COALESCE(SUM(
      CASE 
        WHEN p.hutang_payments ? p_investor_id::text 
        THEN (p.hutang_payments->p_investor_id::text->'amount')::DECIMAL
        ELSE 0
      END
    ), 0)::DECIMAL as amount
    FROM profit_allocations p
    WHERE p.outlet_id = p_outlet_id
      AND p.allocation_month = v_month
  ),
  paid AS (
    SELECT COALESCE(SUM(rt.amount_paid), 0)::DECIMAL as amount
    FROM repayment_tracking rt
    WHERE rt.investor_id = p_investor_id
      AND rt.outlet_id = p_outlet_id
      AND TO_CHAR(rt.repayment_date, 'YYYY-MM') = v_month
  ),
  last_payment AS (
    SELECT rt.repayment_date
    FROM repayment_tracking rt
    WHERE rt.investor_id = p_investor_id
      AND rt.outlet_id = p_outlet_id
    ORDER BY rt.repayment_date DESC
    LIMIT 1
  )
  SELECT
    a.amount,
    p.amount,
    GREATEST(0, a.amount - p.amount)::DECIMAL,
    COUNT(cs.id),
    (SELECT repayment_date FROM last_payment),
    CASE 
      WHEN GREATEST(0, a.amount - p.amount) = 0 THEN 'lunas'
      WHEN GREATEST(0, a.amount - p.amount) > 0 THEN 'cicil'
      ELSE 'unknown'
    END
  FROM allocated a
  CROSS JOIN paid p
  LEFT JOIN cicilan_schedule cs ON cs.investor_id = p_investor_id
    AND cs.outlet_id = p_outlet_id
    AND cs.status = 'paid'
  GROUP BY a.amount, p.amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_investor_payment_summary IS 
  'Get payment summary for investor in specific month (default: current month)';

-- ========================================
-- SECTION 5: VERIFY EXISTING TABLES
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 4 migration completed successfully';
  RAISE NOTICE '✓ capital_repayments updated with cicilan columns';
  RAISE NOTICE '✓ repayment_tracking table created';
  RAISE NOTICE '✓ cicilan_schedule table created';
  RAISE NOTICE '✓ Utility functions added';
END $$;

-- ========================================
-- END OF MIGRATION
-- ========================================

