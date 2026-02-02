-- Purge Phase 4: Final User-Verified Intruders
-- Deleting specific non-pharma brands identified in the final review.

WITH products_to_delete AS (
    SELECT id FROM products WHERE brand IN (
        -- Food / Snacks
        'BurbujaPizza', 'St Dalfour', 'Snak Club', 'Best Gluten Free',
        'Sweetbees', 'Sweetbess', 'Galletas', 'Obleas', 'Soy-Tex',
        'Rice Cakes', 'Tapioca', 'Sirope', 'Ponche', 'Pistacho', 
        'Mani', 'Merey', 'Almendras', 'Avellanas', 'Nueces',
        
        -- Supplements (Intruders per user request)
        'Ana Maria Lajusticia', 'Himalaya', 'Slim Down', 'Keto',
        
        -- Sports / Apparel / Accessories
        'Sportlast', 'TYR', 'SPL', 'Lentes', 'Gafas',
        
        -- Misc / Supplies
        'Two5med', 'Spraymedic', 'Sterigel', 'Steriph', 'Suprasorb',
        'T220', 'Tabletas', 'Sobres', 'Unidad'
    )
)
-- Delete dependent tables first (Cascade safety)
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
-- Delete products
DELETE FROM products WHERE id IN (SELECT id FROM products_to_delete);

-- Final Check
SELECT count(*) as intruders_remaining FROM products WHERE brand IN ('BurbujaPizza', 'Sportlast');
