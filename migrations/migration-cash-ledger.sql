-- ========================================
-- CASH LEDGER SYSTEM SETUP
-- Run this in Supabase SQL Editor after the main schema exists
-- ========================================

CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('inflow', 'outflow')),
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  amount DECIMAL(15, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_transactions_all" ON cash_transactions FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_outlet ON cash_transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_source ON cash_transactions(source_type, source_id);
