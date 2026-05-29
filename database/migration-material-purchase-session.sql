-- Migration: Link material purchases to daily sessions
-- Purpose: Make material purchases part of the same daily session as sales and expenses
-- Date: 2026-05-29

ALTER TABLE IF EXISTS material_purchases
ADD COLUMN IF NOT EXISTS session_id UUID NULL REFERENCES daily_sessions(id) ON DELETE SET NULL;

COMMENT ON COLUMN material_purchases.session_id IS 'Daily session that owns this material purchase';

CREATE INDEX IF NOT EXISTS idx_material_purchases_session_id
ON material_purchases(session_id);