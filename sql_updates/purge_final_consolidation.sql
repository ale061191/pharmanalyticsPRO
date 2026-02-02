-- Purge Phase 7: FINAL CONSOLIDATION (The "109 Labs" Synchronization) - with CASCADING DELETE
-- Aligning the database with the verified structure from productos_farmacologicos.txt

BEGIN;

-- 1. CONSOLIDATION (Merging Variants into Canonical Names)
UPDATE products SET brand = 'MCK Pharmaceuticals' WHERE brand IN ('MCK', 'Mck', 'Mck Pharmaceutical', 'MCK Pharmaceutical', 'MCK Pharmaceuticals');
UPDATE products SET brand = 'Laboratorios Farma' WHERE brand IN ('Actumir Laboratorios Farma', 'Farma', 'Farma D');
UPDATE products SET brand = 'Leti' WHERE brand IN ('Leti S.A.V.', 'Laboratorios Leti', 'Pegyt Leti', 'Letti');
UPDATE products SET brand = 'Pharmetique Labs' WHERE brand IN ('Pharmetique', 'Pharmetique Consumo');
UPDATE products SET brand = 'Siegfried' WHERE brand IN ('Bendamen Siegfried Meyer', 'Siegfried Meyer');
UPDATE products SET brand = 'Genven' WHERE brand = 'GENVEN';
UPDATE products SET brand = 'Biotech' WHERE brand LIKE 'Lactbet%Biotech%';
UPDATE products SET brand = 'Biotech' WHERE brand = 'Di - Eudrin Biotech';
UPDATE products SET brand = 'Ronava' WHERE brand = 'Algoren Ronava';
UPDATE products SET brand = 'Polinac' WHERE brand = 'Madecassol Polinac';
UPDATE products SET brand = 'SNC Pharma' WHERE brand = 'Letalop SNC Pharma';
UPDATE products SET brand = 'Laboratorios Portugal' WHERE brand = 'Bexaderm Portugal';
UPDATE products SET brand = 'Medigen' WHERE brand = 'Medigen Oftalmi';
UPDATE products SET brand = 'Aless Pharmaceuticals' WHERE brand = 'Aless Pharm';
UPDATE products SET brand = 'Altian Pharma' WHERE brand IN ('Altian', 'Altian Pharma');
UPDATE products SET brand = 'Laboratorios Buka' WHERE brand = 'Buka';

-- 2. CASCADING DELETION OF CONFIRMED INTRUDERS / NON-LABS
WITH products_to_delete AS (
    SELECT id FROM products WHERE brand IN (
        'Montalbán', -- Sugar/Food
        'Miagest', -- Product
        'Molina Pro Salud', -- Retailer/Service
        'MT Global',
        'Mt Global Care',
        'MT Global Care',
        'Mucofar',
        'Oftalmica', -- Adjective
        'Tamsulon Duo', -- Product
        'Medifarm', -- Unknown/Generic
        'Medpharma',
        'Medline', -- Often supplies, but maybe generic.
        'Metal Endurance', -- Sports
        'Clarivision',
        'Compomedica',
        'Cosmelab',
        'Alm Gammaf'
    )
),
delete_inventory AS (
    DELETE FROM store_inventory WHERE product_id IN (SELECT id FROM products_to_delete)
),
delete_sales_snapshot AS (
    DELETE FROM sales_snapshot WHERE product_id IN (SELECT id::text FROM products_to_delete)
),
delete_hourly_sales AS (
    DELETE FROM hourly_sales WHERE product_id IN (SELECT id::text FROM products_to_delete)
),
delete_stock_history AS (
    DELETE FROM stock_history WHERE product_id IN (SELECT id::text FROM products_to_delete)
)
DELETE FROM products WHERE id IN (SELECT id FROM products_to_delete);

COMMIT;
