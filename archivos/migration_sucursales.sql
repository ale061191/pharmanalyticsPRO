-- Migration: Standardize 'sucursales' and 'stock_detail' for Map v2 (Fixed)

-- 1. Ensure 'sucursales' exists and has all columns
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for sucursales
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS municipality TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS lng FLOAT;

-- 2. Create 'stock_detail' if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  store_name TEXT,
  stock_count INTEGER,
  availability_status TEXT, 
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRITICAL: Explicitly add columns that might be missing if table existed
ALTER TABLE stock_detail ADD COLUMN IF NOT EXISTS lab_name TEXT;
ALTER TABLE stock_detail ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE stock_detail ADD COLUMN IF NOT EXISTS sector TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_detail_product ON stock_detail(product_name);
CREATE INDEX IF NOT EXISTS idx_stock_detail_location ON stock_detail(city, sector);

-- Disable RLS
ALTER TABLE sucursales DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_detail DISABLE ROW LEVEL SECURITY;
