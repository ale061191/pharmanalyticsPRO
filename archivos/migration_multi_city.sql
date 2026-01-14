-- Pharmanalytics: Migración para soporte multi-ciudad
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de sucursales/ciudades principales de Venezuela
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insertar ciudades principales (solo si no existen)
INSERT INTO sucursales (name, city, latitude, longitude) 
SELECT * FROM (VALUES
  ('Caracas Centro', 'Caracas', 10.4806, -66.9036),
  ('Maracaibo Centro', 'Maracaibo', 10.6666, -71.6124),
  ('Valencia Centro', 'Valencia', 10.1579, -67.9972),
  ('Barquisimeto Centro', 'Barquisimeto', 10.0678, -69.3474),
  ('Maracay Centro', 'Maracay', 10.2469, -67.5958),
  ('Puerto La Cruz Centro', 'Puerto La Cruz', 10.2146, -64.6297)
) AS data(name, city, latitude, longitude)
WHERE NOT EXISTS (SELECT 1 FROM sucursales LIMIT 1);

-- 3. Tabla de historial de stock por ciudad
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  city TEXT NOT NULL,
  stock_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para consultas rápidas de trends y rankings
CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_name);
CREATE INDEX IF NOT EXISTS idx_stock_history_city ON stock_history(city);
CREATE INDEX IF NOT EXISTS idx_stock_history_date ON stock_history(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_history_product_city ON stock_history(product_name, city);

-- 5. Vista para cálculo de ventas estimadas (Δstock)
CREATE OR REPLACE VIEW ventas_estimadas AS
SELECT 
  sh1.product_name,
  sh1.city,
  sh1.stock_count as stock_actual,
  sh2.stock_count as stock_anterior,
  GREATEST(0, sh2.stock_count - sh1.stock_count) as ventas_estimadas,
  sh1.scraped_at
FROM stock_history sh1
LEFT JOIN LATERAL (
  SELECT stock_count, scraped_at
  FROM stock_history sh2
  WHERE sh2.product_name = sh1.product_name 
    AND sh2.city = sh1.city
    AND sh2.scraped_at < sh1.scraped_at
  ORDER BY sh2.scraped_at DESC
  LIMIT 1
) sh2 ON true
ORDER BY sh1.scraped_at DESC;

-- 6. Habilitar RLS (opcional, ajustar según necesidades)
-- ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
