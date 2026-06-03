-- Add channel-specific price columns to products and backfill from existing price
BEGIN;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS price_offline numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_shopeefood numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_gofood numeric DEFAULT NULL;

-- Backfill new columns from legacy price column if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
    -- If legacy `price` exists, use it as default for the three channel prices when unset
    UPDATE products
    SET price_offline = COALESCE(price_offline, price),
        price_shopeefood = COALESCE(price_shopeefood, price),
        price_gofood = COALESCE(price_gofood, price)
    WHERE price IS NOT NULL;
  END IF;
END$$;

COMMIT;

-- Idempotent: safe to run multiple times
