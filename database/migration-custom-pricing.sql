-- Migration: Add Custom Pricing Support to Sales
-- Date: 2026-06-07
-- Purpose: Enable flexible special customer pricing with tracking

BEGIN;

-- Add custom pricing columns to sales table
ALTER TABLE sales
ADD COLUMN type TEXT DEFAULT 'regular' CHECK (type IN ('regular', 'custom')),
ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN quantity INTEGER,
ADD COLUMN is_custom_price BOOLEAN DEFAULT false,
ADD COLUMN custom_original_price DECIMAL(10,2),
ADD COLUMN custom_final_price DECIMAL(10,2),
ADD COLUMN custom_description TEXT;

-- Create index for filtering custom sales
CREATE INDEX idx_sales_type ON sales(type);
CREATE INDEX idx_sales_is_custom_price ON sales(is_custom_price);

-- Create index for session + custom sales queries
CREATE INDEX idx_sales_session_type ON sales(session_id, type);

-- Add constraint: if is_custom_price is true, all custom fields must be set
ALTER TABLE sales
ADD CONSTRAINT custom_pricing_completeness
CHECK (
  (NOT is_custom_price) OR
  (is_custom_price AND custom_original_price IS NOT NULL AND custom_final_price IS NOT NULL AND custom_description IS NOT NULL)
);

-- Add constraint: custom_final_price must be less than or equal to custom_original_price
ALTER TABLE sales
ADD CONSTRAINT custom_pricing_valid
CHECK (
  (NOT is_custom_price) OR
  (is_custom_price AND custom_final_price <= custom_original_price)
);

COMMIT;
