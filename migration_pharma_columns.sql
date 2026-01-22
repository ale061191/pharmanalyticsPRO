-- MIGRATION: ADD PHARMA CLASSIFICATION COLUMNS
-- Run this in the Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_pharma BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS classification TEXT,         -- 'MEDICAMENTO', 'SUPLEMENTO', 'COSMETICO', etc.
ADD COLUMN IF NOT EXISTS active_ingredient TEXT,      -- 'Ibuprofeno'
ADD COLUMN IF NOT EXISTS clean_name TEXT,             -- 'Advil'
ADD COLUMN IF NOT EXISTS presentation TEXT;           -- 'Tabletas'

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_is_pharma ON products(is_pharma);
CREATE INDEX IF NOT EXISTS idx_products_classification ON products(classification);
