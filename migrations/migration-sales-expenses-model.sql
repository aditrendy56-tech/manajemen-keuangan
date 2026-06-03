-- Migration: Extend sales and expenses model for session-centric daily reporting
-- Date: 2026-05-29

-- SALES
ALTER TABLE IF EXISTS sales
ADD COLUMN IF NOT EXISTS session_id UUID NULL REFERENCES daily_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS outlet_id UUID NULL REFERENCES outlets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS channel_type TEXT NULL,
ADD COLUMN IF NOT EXISTS platform TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_status TEXT NULL DEFAULT 'settled',
ADD COLUMN IF NOT EXISTS settlement_date DATE NULL,
ADD COLUMN IF NOT EXISTS payment_entries JSONB NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC NULL,
ADD COLUMN IF NOT EXISTS refund_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS refund_reference TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_reference TEXT NULL;

COMMENT ON COLUMN sales.channel_type IS 'Logical channel group: offline or online';
COMMENT ON COLUMN sales.platform IS 'Online platform or legacy channel label such as shopeefood/gofood';
COMMENT ON COLUMN sales.payment_status IS 'Settlement status of the sale payment';
COMMENT ON COLUMN sales.settlement_date IS 'Date when the payment is considered settled';
COMMENT ON COLUMN sales.payment_entries IS 'Split payment entries for sales, stored as JSON array';
COMMENT ON COLUMN sales.refund_amount IS 'Amount refunded for the sale, if any';
COMMENT ON COLUMN sales.refund_reason IS 'Reason for refund or reversal';
COMMENT ON COLUMN sales.refunded_at IS 'Timestamp when the refund was processed';
COMMENT ON COLUMN sales.refund_reference IS 'Optional refund reference number';
COMMENT ON COLUMN sales.payment_reference IS 'Optional reference to payout, receipt, or order id';

CREATE INDEX IF NOT EXISTS idx_sales_session_id ON sales(session_id);
CREATE INDEX IF NOT EXISTS idx_sales_outlet_created_at ON sales(outlet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);

-- EXPENSES
ALTER TABLE IF EXISTS expenses
ADD COLUMN IF NOT EXISTS session_id UUID NULL REFERENCES daily_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS outlet_id UUID NULL REFERENCES outlets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_method TEXT NULL DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS payment_status TEXT NULL DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS settlement_date DATE NULL,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC NULL,
ADD COLUMN IF NOT EXISTS refund_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS refund_reference TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_reference TEXT NULL;

COMMENT ON COLUMN expenses.payment_method IS 'Payment method used for the expense';
COMMENT ON COLUMN expenses.payment_status IS 'Payment status of the expense';
COMMENT ON COLUMN expenses.settlement_date IS 'Date when the expense payment settles, if not immediate';
COMMENT ON COLUMN expenses.refund_amount IS 'Amount refunded back for the expense';
COMMENT ON COLUMN expenses.refund_reason IS 'Reason for expense refund or reversal';
COMMENT ON COLUMN expenses.refunded_at IS 'Timestamp when the expense reversal was processed';
COMMENT ON COLUMN expenses.refund_reference IS 'Optional refund reference number for the expense reversal';
COMMENT ON COLUMN expenses.payment_reference IS 'Optional reference number or note for payment';

CREATE INDEX IF NOT EXISTS idx_expenses_session_id ON expenses(session_id);
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_date ON expenses(outlet_id, date);
