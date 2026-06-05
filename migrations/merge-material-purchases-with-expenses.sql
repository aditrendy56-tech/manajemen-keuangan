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
-- Check if category enum exists and handle accordingly
DO $$ 
DECLARE
  v_enum_exists boolean;
BEGIN
  -- Check if the category enum type exists
  SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'category' AND typtype = 'e') INTO v_enum_exists;
  
  IF NOT v_enum_exists THEN
    -- Create the enum from scratch if it doesn't exist
    CREATE TYPE category AS ENUM (
      'operasional',
      'bahan',
      'peralatan',
      'gabungan'
    );
  ELSE
    -- If enum exists, add new values that don't exist yet
    -- Note: ALTER TYPE ADD VALUE can only be done in a transaction or with restrictions
    -- Safe approach: create new type and migrate
    CREATE TYPE category_new AS ENUM (
      'operasional',
      'bahan',
      'peralatan',
      'gabungan'
    );
    
    -- Migrate column to new enum type
    ALTER TABLE expenses 
      ALTER COLUMN category SET DATA TYPE category_new USING category::text::category_new;
    
    -- Drop old enum and rename new one
    DROP TYPE category;
    ALTER TYPE category_new RENAME TO category;
  END IF;
END $$;
