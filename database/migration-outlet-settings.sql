-- Migration: Outlet settings storage
-- Purpose: Persist business/outlet settings per outlet so the Settings page is real-data backed
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS outlet_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL UNIQUE REFERENCES outlets(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  outlet_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE outlet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outlet_settings_all" ON outlet_settings FOR ALL USING (true);

COMMENT ON TABLE outlet_settings IS 'Per-outlet business settings shown in the Settings page';
COMMENT ON COLUMN outlet_settings.currency IS 'Default currency used for formatting and reports';