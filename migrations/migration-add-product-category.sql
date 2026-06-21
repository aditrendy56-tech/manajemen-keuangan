-- Add category column to products (VARCHAR) and backfill as NULL
BEGIN;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS category varchar DEFAULT NULL;

-- No automatic backfill; existing products will remain NULL until updated via UI or scripts

COMMIT;

-- Idempotent: safe to run multiple times
