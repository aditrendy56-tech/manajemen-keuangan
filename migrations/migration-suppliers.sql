-- Create SUPPLIERS table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  address TEXT,
  opening_hours VARCHAR(100),
  quality_rating DECIMAL(3,1),
  reliability VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SUPPLIER_PRICES table
CREATE TABLE IF NOT EXISTS supplier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  unit_price DECIMAL(12,2) NOT NULL,
  minimum_order INT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alter MATERIAL_PURCHASES table to add supplier tracking
ALTER TABLE material_purchases
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quality VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_outlet ON suppliers(outlet_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier ON supplier_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_material ON supplier_prices(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier ON material_purchases(supplier_id);
