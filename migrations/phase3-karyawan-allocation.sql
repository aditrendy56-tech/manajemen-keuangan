-- ========================================
-- PHASE 3: KARYAWAN (EMPLOYEE) ALLOCATION
-- ========================================
-- Purpose: Add employee allocation capability to profit distribution
-- This migration enables allocating profit to employees (gaji, bonus, thr)
-- alongside investor hutang cicilan repayments

-- Run this migration in Supabase SQL Editor

-- ========================================
-- SECTION 1: CREATE EMPLOYEES TABLE
-- ========================================
-- Track outlet employees and their salary info

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Personal info
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Employment details
  role VARCHAR(100) NOT NULL, -- Kepala Toko, Kasir, Koki, etc
  department VARCHAR(100),    -- Produksi, Penjualan, Admin, etc
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned', 'suspended')),
  
  -- Salary info
  base_salary DECIMAL(15, 2),
  salary_type VARCHAR(50) DEFAULT 'bulanan' CHECK (salary_type IN ('bulanan', 'harian', 'jam')),
  
  -- Tracking
  hire_date DATE,
  last_salary_paid_date DATE,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_employees_outlet ON employees(outlet_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_outlet_status ON employees(outlet_id, status);

-- Add comments for clarity
COMMENT ON TABLE employees IS 'Track outlet employees and salary information';
COMMENT ON COLUMN employees.outlet_id IS 'Which outlet this employee works for';
COMMENT ON COLUMN employees.role IS 'Job role/position (Kepala Toko, Kasir, Koki, etc)';
COMMENT ON COLUMN employees.status IS 'Current employment status (active/inactive/resigned)';
COMMENT ON COLUMN employees.base_salary IS 'Monthly or base salary amount';

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_all" ON employees;
CREATE POLICY "employees_all" ON employees FOR ALL USING (true);

-- ========================================
-- SECTION 2: UPDATE PROFIT_ALLOCATIONS TABLE
-- ========================================
-- Add columns to track employee allocations

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS employee_mode VARCHAR(50) DEFAULT 'exclude' 
  CHECK (employee_mode IN ('exclude', 'include'));

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS karyawan_allocations JSONB;

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS total_employee_allocation DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE profit_allocations
ADD COLUMN IF NOT EXISTS employee_allocation_notes TEXT;

-- Add comments
COMMENT ON COLUMN profit_allocations.employee_mode IS 
  'Whether to include employee allocations (exclude/include)';

COMMENT ON COLUMN profit_allocations.karyawan_allocations IS 
  'JSON array of employee allocations: [{ employee_id, amount, type }]';

COMMENT ON COLUMN profit_allocations.total_employee_allocation IS 
  'Total amount allocated to employees in this allocation';

COMMENT ON COLUMN profit_allocations.employee_allocation_notes IS 
  'Notes/reason for employee allocations';

-- ========================================
-- SECTION 3: CREATE EMPLOYEE_ALLOCATIONS TABLE
-- ========================================
-- Detailed tracking of individual employee allocations

CREATE TABLE IF NOT EXISTS employee_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  profit_allocation_id UUID NOT NULL REFERENCES profit_allocations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Allocation details
  allocation_amount DECIMAL(15, 2) NOT NULL CHECK (allocation_amount > 0),
  allocation_type VARCHAR(50) NOT NULL DEFAULT 'gaji' 
    CHECK (allocation_type IN ('gaji', 'bonus', 'thr', 'bonus_produksi', 'komisi')),
  allocation_month VARCHAR(10) NOT NULL, -- "2026-06" format
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_date DATE,
  
  -- Reference info
  allocation_reason VARCHAR(255), -- e.g., "Monthly salary June", "Performance bonus"
  notes TEXT,
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by VARCHAR(255)
);

-- Create indexes for fast queries
CREATE INDEX idx_employee_allocations_outlet ON employee_allocations(outlet_id);
CREATE INDEX idx_employee_allocations_employee ON employee_allocations(employee_id);
CREATE INDEX idx_employee_allocations_profit_allocation ON employee_allocations(profit_allocation_id);
CREATE INDEX idx_employee_allocations_month ON employee_allocations(allocation_month);
CREATE INDEX IF NOT EXISTS idx_employee_allocations_outlet_month ON employee_allocations(outlet_id, allocation_month);
CREATE INDEX IF NOT EXISTS idx_employee_allocations_status ON employee_allocations(status);

-- Add comments
COMMENT ON TABLE employee_allocations IS 'Detailed tracking of employee salary/bonus allocations from profit';
COMMENT ON COLUMN employee_allocations.allocation_type IS 'Type of allocation (gaji/bonus/thr/komisi)';
COMMENT ON COLUMN employee_allocations.allocation_month IS 'Which month allocation applies to (YYYY-MM format)';
COMMENT ON COLUMN employee_allocations.status IS 'Payment status (pending/approved/paid/cancelled)';

-- Enable RLS
ALTER TABLE employee_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_allocations_all" ON employee_allocations;
CREATE POLICY "employee_allocations_all" ON employee_allocations FOR ALL USING (true);

-- ========================================
-- SECTION 4: ADD UTILITY FUNCTION
-- ========================================
-- Calculate total employee allocation for a specific outlet in a month

CREATE OR REPLACE FUNCTION get_employee_allocation_summary(
  p_outlet_id UUID,
  p_month VARCHAR
)
RETURNS TABLE (
  total_allocated DECIMAL,
  employee_count BIGINT,
  allocation_types TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ea.allocation_amount), 0::DECIMAL)::DECIMAL,
    COUNT(DISTINCT ea.employee_id),
    STRING_AGG(DISTINCT ea.allocation_type, ', ')
  FROM employee_allocations ea
  WHERE ea.outlet_id = p_outlet_id
    AND ea.allocation_month = p_month
    AND ea.status IN ('pending', 'approved', 'paid');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_employee_allocation_summary IS 
  'Get summary of employee allocations for an outlet in a specific month';

-- ========================================
-- SECTION 5: ADD ALLOCATION FLOW CALCULATION FUNCTION
-- ========================================
-- Helper function for profit allocation workflow

CREATE OR REPLACE FUNCTION calculate_profit_allocation_breakdown(
  p_total_profit DECIMAL,
  p_investor_hutang DECIMAL,
  p_employee_allocation DECIMAL,
  p_kas_topup DECIMAL,
  p_simpan_uang DECIMAL
)
RETURNS TABLE (
  profit_after_hutang DECIMAL,
  profit_after_employee DECIMAL,
  profit_after_kas DECIMAL,
  remaining_for_investor_share DECIMAL,
  allocation_valid BOOLEAN,
  validation_message TEXT
) AS $$
DECLARE
  v_profit_after_hutang DECIMAL;
  v_profit_after_employee DECIMAL;
  v_profit_after_kas DECIMAL;
  v_remaining DECIMAL;
  v_valid BOOLEAN;
  v_message TEXT;
BEGIN
  v_profit_after_hutang := GREATEST(0, p_total_profit - COALESCE(p_investor_hutang, 0));
  v_profit_after_employee := GREATEST(0, v_profit_after_hutang - COALESCE(p_employee_allocation, 0));
  v_profit_after_kas := GREATEST(0, v_profit_after_employee - COALESCE(p_kas_topup, 0));
  v_remaining := GREATEST(0, v_profit_after_kas - COALESCE(p_simpan_uang, 0));
  
  -- Validation
  v_valid := TRUE;
  v_message := 'OK';
  
  IF (COALESCE(p_investor_hutang, 0) + COALESCE(p_employee_allocation, 0) + 
      COALESCE(p_kas_topup, 0) + COALESCE(p_simpan_uang, 0)) > p_total_profit THEN
    v_valid := FALSE;
    v_message := 'Total allocations exceed available profit';
  END IF;
  
  RETURN QUERY SELECT 
    v_profit_after_hutang,
    v_profit_after_employee,
    v_profit_after_kas,
    v_remaining,
    v_valid,
    v_message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_profit_allocation_breakdown IS 
  'Validate and calculate profit allocation breakdown for allocation flow';

-- ========================================
-- SECTION 6: VERIFY EXISTING TABLES
-- ========================================
-- Verify profit_allocations table has required columns

DO $$
BEGIN
  -- Check if profit_allocations exists and has required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profit_allocations' 
    AND column_name = 'employee_mode'
  ) THEN
    RAISE NOTICE 'Warning: employee_mode column not found in profit_allocations';
  END IF;
  
  RAISE NOTICE 'Phase 3 migration completed successfully';
END $$;

-- ========================================
-- SECTION 7: SAMPLE DATA (Optional - uncomment to use)
-- ========================================
-- INSERT INTO employees (outlet_id, name, phone, role, status, base_salary, hire_date)
-- VALUES 
--   ('660e8400-e29b-41d4-a716-446655440000', 'Budi Santoso', '0821-1111-1111', 'Kepala Toko', 'active', 3000000, '2024-01-15'),
--   ('660e8400-e29b-41d4-a716-446655440000', 'Siti Nurhaliza', '0821-2222-2222', 'Kasir', 'active', 2000000, '2024-03-01'),
--   ('660e8400-e29b-41d4-a716-446655440000', 'Ahmad Rizki', '0821-3333-3333', 'Koki', 'active', 2500000, '2024-02-10');

-- ========================================
-- END OF MIGRATION
-- ========================================

