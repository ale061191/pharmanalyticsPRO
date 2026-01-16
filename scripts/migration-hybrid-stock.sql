-- =============================================
-- Pharmanalytics - Stock System Migration
-- Hybrid 3-Layer Architecture Support
-- =============================================

-- 1. Enhance stock_detail table with priority and tracking
ALTER TABLE IF EXISTS stock_detail 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS scrape_count INTEGER DEFAULT 0;

-- Create index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_stock_detail_scraped 
ON stock_detail(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_detail_product 
ON stock_detail(product_name);

-- 2. Create scrape_queue table for on-demand and scheduled scraping
CREATE TABLE IF NOT EXISTS scrape_queue (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_name TEXT,
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue
CREATE INDEX IF NOT EXISTS idx_scrape_queue_status 
ON scrape_queue(status, priority, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_scrape_queue_product 
ON scrape_queue(product_url);

-- 3. Add priority field to products table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMPTZ;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS scrape_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 4. Create stock_history table for historical tracking
CREATE TABLE IF NOT EXISTS stock_history (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT,
  total_stock INTEGER NOT NULL,
  stores_with_stock INTEGER DEFAULT 0,
  avg_per_store NUMERIC(10,2),
  source TEXT DEFAULT 'algolia' CHECK (source IN ('algolia', 'scrape')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for historical queries
CREATE INDEX IF NOT EXISTS idx_stock_history_product 
ON stock_history(product_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_history_date 
ON stock_history(recorded_at DESC);

-- 5. Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for scrape_queue
DROP TRIGGER IF EXISTS update_scrape_queue_timestamp ON scrape_queue;
CREATE TRIGGER update_scrape_queue_timestamp
BEFORE UPDATE ON scrape_queue
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Enable RLS on new tables
ALTER TABLE scrape_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for scrape_queue (allow all operations via service role)
CREATE POLICY "Allow all for authenticated" ON scrape_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for stock_history" ON stock_history
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Summary view for quick statistics
CREATE OR REPLACE VIEW stock_summary AS
SELECT 
  product_name,
  COUNT(DISTINCT store_name) as store_count,
  SUM(stock_count) as total_stock,
  AVG(stock_count)::INTEGER as avg_per_store,
  MAX(scraped_at) as last_updated,
  COUNT(DISTINCT city) as cities_covered
FROM stock_detail
WHERE scraped_at > NOW() - INTERVAL '24 hours'
GROUP BY product_name
ORDER BY total_stock DESC;

-- Done!
SELECT 'Migration completed successfully' as status;
