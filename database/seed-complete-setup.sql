-- ========================================
-- COMPLETE INITIALIZATION & SEED SCRIPT
-- Run this ONCE in Supabase SQL Editor to set up everything
-- ========================================

-- Step 1: Enable uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create businesses table if it doesn't exist
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create outlets table if it doesn't exist  
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Insert default business if none exists
INSERT INTO businesses (id, name)
SELECT uuid_generate_v4(), 'Roti Bakar Business'
WHERE NOT EXISTS (SELECT 1 FROM businesses);

-- Step 5: Insert default outlet if none exists
INSERT INTO outlets (business_id, name, location, is_active)
SELECT 
  b.id,
  'Outlet Utama',
  'Jakarta',
  true
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM outlets)
LIMIT 1;

-- Step 6: Create or update outlet_settings
INSERT INTO outlet_settings (outlet_id, business_name, outlet_name, address, phone, currency)
SELECT 
  o.id,
  'Roti Bakar Business',
  o.name,
  o.location,
  '0812-3456-7890',
  'IDR'
FROM outlets o
WHERE NOT EXISTS (SELECT 1 FROM outlet_settings os WHERE os.outlet_id = o.id)
ON CONFLICT (outlet_id) DO NOTHING;

-- ========================================
-- VERIFICATION: Show results
-- ========================================
SELECT '✅ Businesses:' as status, COUNT(*) as count FROM businesses;
SELECT * FROM businesses;

SELECT '✅ Outlets:' as status, COUNT(*) as count FROM outlets;
SELECT * FROM outlets;

SELECT '✅ Outlet Settings:' as status, COUNT(*) as count FROM outlet_settings;
SELECT * FROM outlet_settings;

SELECT '✅ Setup complete! You can now use the app.' as result;
