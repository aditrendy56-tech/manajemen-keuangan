-- Create table for outlet-specific settings including platform fee rates
BEGIN;

CREATE TABLE IF NOT EXISTS outlet_settings (
  outlet_id uuid PRIMARY KEY,
  business_name text,
  outlet_name text,
  address text,
  phone text,
  currency text DEFAULT 'IDR',
  fee_shopeefood numeric DEFAULT 0.20,
  fee_gofood numeric DEFAULT 0.25,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- trigger to update updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON outlet_settings;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON outlet_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

COMMIT;
