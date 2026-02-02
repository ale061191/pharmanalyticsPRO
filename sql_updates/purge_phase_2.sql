-- Purge Phase 2: Intruder Brands (Food, Supplies, Sweeteners)

-- Identify IDs to delete
WITH products_to_delete AS (
    SELECT id FROM products WHERE brand IN (
        -- Medical Supplies / Hardware
        'Acu-life', 'Aimdent', 'Algobap', 'Alve', 'Angelus', 'Arte Medico', 
        'Blue Medical', 'Briutcare', 'Conair', 'Ebben', 'VPD', 'VPD Cleany', 
        'VPD Cleany Plus', 'VPD Dovant', 'VPD Dynamics', 'VPD JHC Medica',
        'VPD Next Step', 'Pharmaplast', 'Pharmapore', 'Silkplast', 'Steritex',
        
        -- Food / Organics / Snacks
        'Alim Gammf', 'All Organic', 'America Organica', 'América Orgánica',
        'Barilla', 'Naturgourmet', 'Vegan Life', 'Victorias Natural Foods',
        'Vilay', 'Wipala', 'Yoffi', 'Yogranola', 'Zaki', 'Zuzu', 'Andean Food',
        'The Pod Snacks', 'Tostadas', 'Tostitos',
        
        -- Sweeteners (Often viewed as groceries)
        'Equal', 'Splenda', 'Stevia', 'Truvia', 'Sweetest', 'Dulcilina',
        
        -- Misc
        '9-VIT', 'A-D-Vit', '1230', '2008M-0008623'
    )
)
-- Delete from dependent tables
, delete_inventory AS (
    DELETE FROM store_inventory WHERE product_id IN (SELECT id FROM products_to_delete)
)
, delete_sales_snapshot AS (
    DELETE FROM sales_snapshot WHERE product_id IN (SELECT id::text FROM products_to_delete)
)
, delete_hourly_sales AS (
    DELETE FROM hourly_sales WHERE product_id IN (SELECT id::text FROM products_to_delete)
)
, delete_stock_history AS (
    DELETE FROM stock_history WHERE product_id IN (SELECT id::text FROM products_to_delete)
)
-- Finally delete products
DELETE FROM products WHERE id IN (SELECT id FROM products_to_delete);

-- Verify removal
SELECT count(*) as remaining_intruders FROM products WHERE brand IN ('Barilla', 'VPD', 'Splenda');
