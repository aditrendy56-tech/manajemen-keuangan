-- Migration: Add discount tracking columns to sales
-- Date: 2026-06-18
-- Purpose: Track diskon menu (per item) and diskon langsung (multiple) for online sales analysis

ALTER TABLE IF EXISTS sales
ADD COLUMN IF NOT EXISTS diskon_menu_items JSONB NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS diskon_langsung JSONB NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sales.diskon_menu_items IS 'Array of menu discounts with item details: item_index, product_id, product_name, qty, price_normal, price_after_diskon';
COMMENT ON COLUMN sales.diskon_langsung IS 'Array of additional/standalone discounts: urutan (order), amount, notes';

-- Create indexes for discount queries and analytics
CREATE INDEX IF NOT EXISTS idx_sales_diskon_menu ON sales(diskon_menu_items) WHERE diskon_menu_items IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_diskon_langsung ON sales(diskon_langsung) WHERE diskon_langsung IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_outlet_diskon ON sales(outlet_id, created_at) WHERE (diskon_menu_items IS NOT NULL OR diskon_langsung IS NOT NULL);
