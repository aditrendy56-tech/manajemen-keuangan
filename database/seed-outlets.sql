-- ========================================
-- SEED: Outlets Data
-- Run this in Supabase SQL Editor to create demo outlets
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ========================================

-- First, get or create a business
WITH business_data AS (
  SELECT id FROM businesses 
  LIMIT 1
)
INSERT INTO outlets (business_id, name, location, is_active)
SELECT 
  COALESCE((SELECT id FROM business_data), '660e8400-e29b-41d4-a716-446655440000'::uuid),
  'Outlet Demo',
  'Jakarta',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM outlets WHERE name = 'Outlet Demo'
);

-- Verify
SELECT 'Outlets seeded:' as status, COUNT(*) FROM outlets;
SELECT * FROM outlets;
