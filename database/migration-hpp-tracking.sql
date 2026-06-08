-- Migration: Add HPP (Harga Pokok Penjualan) Tracking for Profit Calculation
-- Date: 2026-06-08
-- Purpose: Enable detailed gross profit calculation per item & per sale

-- PHASE 1: Update Products table with cost price
ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0;

COMMENT ON COLUMN products.cost_price IS 'Unit cost price (HPP) for calculating gross profit per item';

-- PHASE 1: Update Sales table with gross profit tracking
ALTER TABLE IF EXISTS sales
ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(15, 2) DEFAULT 0;

COMMENT ON COLUMN sales.gross_profit IS 'Total gross profit (revenue - HPP) for this sale';

-- PHASE 1: Update Sale Items table with detailed HPP & profit tracking
ALTER TABLE IF EXISTS sale_items
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hpp_amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * cost_price) STORED,
ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(15, 2) GENERATED ALWAYS AS (subtotal - (quantity * cost_price)) STORED,
ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN subtotal > 0 THEN ((subtotal - (quantity * cost_price)) / subtotal * 100)
    ELSE 0
  END
) STORED;

COMMENT ON COLUMN sale_items.cost_price IS 'Unit cost price (HPP) at time of sale';
COMMENT ON COLUMN sale_items.hpp_amount IS 'Total cost of goods: quantity * cost_price';
COMMENT ON COLUMN sale_items.gross_profit IS 'Line item gross profit: subtotal - hpp_amount';
COMMENT ON COLUMN sale_items.profit_margin_percent IS 'Line item profit margin %: (subtotal - hpp) / subtotal * 100';

-- Create indexes for profit analysis
CREATE INDEX IF NOT EXISTS idx_sale_items_gross_profit ON sale_items(gross_profit);
CREATE INDEX IF NOT EXISTS idx_products_cost_price ON products(cost_price);

-- PHASE 1: Initialization - Set default cost_price for existing products
-- DEFAULT: cost_price = 40% of highest available selling price channel
UPDATE products
SET cost_price = COALESCE(price_offline, price_shopeefood, price_gofood, price, 0) * 0.4
WHERE cost_price = 0 AND COALESCE(price_offline, price_shopeefood, price_gofood, price, 0) > 0;

-- Log migration completion
SELECT COUNT(*) as products_with_cost_price FROM products WHERE cost_price > 0;
