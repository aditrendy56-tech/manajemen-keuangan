-- Migration: Add category tracking to capital_entries table
-- This adds support for modal per kategori (peralatan, bahan_awal, rencana_tambahan)

-- Add category column to capital_entries
ALTER TABLE capital_entries 
ADD COLUMN category VARCHAR(50),
ADD COLUMN items JSONB;

-- Add comment for clarity
COMMENT ON COLUMN capital_entries.category IS 'Category: peralatan, bahan_awal, rencana_tambahan';
COMMENT ON COLUMN capital_entries.items IS 'JSON array of items: {name, quantity, unit_price, total_price, condition}';

-- Sample data: Peralatan untuk Teman A
INSERT INTO capital_entries (
  id, 
  outlet_id, 
  date, 
  amount, 
  source_type, 
  investor_id, 
  category, 
  items, 
  notes
) VALUES (
  '11000000-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  '2026-05-25',
  204950,
  'investor',
  'ee0e8400-e29b-41d4-a716-446655440000',
  'peralatan',
  '[
    {"name": "Kompor", "quantity": 1, "unit_price": 102475, "total_price": 102475, "condition": "baik"},
    {"name": "Wajan", "quantity": 1, "unit_price": 102475, "total_price": 102475, "condition": "baik"}
  ]',
  'Peralatan dasar dari Teman A'
);

-- Sample data: Rencana Tambahan untuk Teman B
INSERT INTO capital_entries (
  id,
  outlet_id,
  date,
  amount,
  source_type,
  investor_id,
  category,
  items,
  notes
) VALUES (
  '22000000-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  '2026-05-26',
  100000,
  'investor',
  'ff0e8400-e29b-41d4-a716-446655440000',
  'rencana_tambahan',
  '[
    {"name": "Kursi", "quantity": 3, "unit_price": 30000, "total_price": 90000, "condition": "baik"},
    {"name": "Meja", "quantity": 1, "unit_price": 10000, "total_price": 10000, "condition": "baik"}
  ]',
  'Rencana pembelian furniture'
);

-- Optional: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_capital_entries_category 
ON capital_entries(outlet_id, category);

-- ✅ Done! capital_entries sekarang support category dan items detail
