-- Phase 1: Backup existing material purchases
CREATE TABLE material_purchases_backup AS 
SELECT * FROM material_purchases;

-- Phase 2: Clear material_purchases table
TRUNCATE TABLE material_purchases;

-- Phase 3: Add new columns to expenses table for material purchase tracking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS raw_material_id UUID REFERENCES raw_materials(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quality VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Phase 4: Update expenses.category enum to include new categories
-- First, create new enum type
CREATE TYPE category_new AS ENUM (
  'operasional',
  'bahan',
  'peralatan',
  'gabungan',
  'transport',
  'lain_lain'
);

-- Alter the column to use new enum
ALTER TABLE expenses 
  ALTER COLUMN category SET DATA TYPE category_new USING category::text::category_new;

-- Drop old enum
DROP TYPE category CASCADE;

-- Rename new enum
ALTER TYPE category_new RENAME TO category;
