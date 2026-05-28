-- Migration: Add session status tracking
-- Purpose: Enable session lifecycle management (open/closed) with closed_at tracking
-- Date: 2026-05-29

-- Add closed_at timestamp for tracking when session was closed
ALTER TABLE daily_sessions 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL;

-- Note: status column already exists in daily_sessions with DEFAULT 'open'
-- The status field already supports 'open' and 'closed' values per README.md schema
-- This migration only adds the closed_at tracking column

COMMENT ON COLUMN daily_sessions.status IS 'Session status: open (active), closed (finalized)';
COMMENT ON COLUMN daily_sessions.closed_at IS 'Timestamp when session was closed (set when user clicks Tutup Sesi)';

