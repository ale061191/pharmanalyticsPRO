-- Migration: Add detailed stock table for city > sector > store data
-- Run this in Supabase SQL Editor

-- Table for detailed store-level stock data
CREATE TABLE IF NOT EXISTS stock_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  city TEXT NOT NULL,
  sector TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_address TEXT,
  stock_count INT DEFAULT 0,
  availability_status TEXT CHECK (availability_status IN ('high', 'medium', 'low', 'none')),
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for development (same as other tables)
ALTER TABLE stock_detail DISABLE ROW LEVEL SECURITY;

-- Index for fast queries by product and city
CREATE INDEX IF NOT EXISTS idx_stock_detail_product_city 
ON stock_detail(product_name, city);

-- Index for fast lookups by scraped_at
CREATE INDEX IF NOT EXISTS idx_stock_detail_scraped 
ON stock_detail(scraped_at DESC);

-- View to aggregate stock by city and sector
CREATE OR REPLACE VIEW stock_by_city_sector AS
SELECT 
  product_name,
  city,
  sector,
  SUM(stock_count) as total_stock,
  COUNT(*) as store_count,
  MAX(scraped_at) as last_update
FROM stock_detail
GROUP BY product_name, city, sector
ORDER BY city, sector;
