-- Purge Phase 3: Strict Pharma Only
-- Deleting Supplements, Nutritional Products, and Medical Supplies

WITH products_to_delete AS (
    SELECT id FROM products WHERE brand IN (
        -- Clean Supplements / Vitamins / Nutrition
        'Now', 'Natural Systems', 'Naturlife', 'Sascha Fitness', 
        'Enterex', 'Nutritek', 'Sugar Krush', 'Simply7', 'Nature''s Path',
        'Natural Premium', 'Preventud Plus', 'Glier', 'Going',
        'Rarivit', 'Val', 'VAL', 'NutraBrain', 'Body',
        'Truballs', 'El Valle', 'Terraepane', 'Vital Honey Dose',
        '2 Fit', 'About Time', 'Adel Ponce y Benzo', 'Alfa Vitamins',
        'All Organic', 'America Organica', 'América Orgánica', 'Andean Food',
        'Apiangostura', 'Arco Iris', 'Arcoiris', 'Arizona', 'Ascenda',
        'Beauty Sleep', 'Best Choice', 'Blue Medical', 'Briutcare',
        'Cellu Fit', 'Chef', 'Cifarma', 'Coca Cola', 'Conair', 'Conuco',
        'CureBand', 'Curitas', 'Damel', 'Del Monte', 'Diablitos',
        'Diet', 'Dietetico', 'Dioxogen Med', 'Dixson', 'Dr. Brown''s',
        'Drink Mix', 'Dulci Light', 'Dulcilina', 'Ebben', 'El Jarillo',
        'Energizer', 'Equal', 'Everlast', 'Evolution', 'Exit', 'Falidu',
        'Farmatodo (Fórmula Magistral)', 'Fórmula Magistral Farmatodo', 
        'Fit and Slim', 'FlexiVita', 'Florina', 'Food', 'Freegells',
        'Gatorade', 'Gillette', 'Glucidex', 'Glucerna', 'Golden',
        'Green Pharma', 'Gummies', 'Heinz', 'Helios', 'Herbaplant', 
        'High Energy', 'Honey', 'IntyProb', 'Isogel', 'Isolatada',
        'Jogger', 'K6', 'Kaldini', 'Kellogg''s', 'Keto', 'Kit',
        'Klinos', 'KT Tape', 'Kupiec', 'Kx', 'KX', 'Lindt', 'Lipton',
        'Live & Fit', 'Live&Fit', 'Maizena', 'Mancuerna', 'Marnys',
        'Massi', 'Mavesa', 'McCormick', 'Meal Replacement', 'Medi Varic',
        'Medical', 'Medipatch', 'Mermelada', 'Muscle Force', 'Naru',
        'Natural', 'Nature', 'Naturgourmet', 'Natulac', 'Neilmed',
        'Nestle', 'Nexcare', 'Nike', 'Nivea', 'Nnova Rice', 'Noglut',
        'Nordic Vision', 'Nutricell', 'Nutrilon', 'Nutrisite', 'Omega 3',
        'Optiko', 'Oreo', 'Ortoban', 'Oscar Mayer', 'Pampers', 'Pepsi',
        'Pharmalast', 'Pharmaplast', 'Pharmapore', 'Planters', 'Polinac',
        'Pringles', 'Procare', 'Protein', 'Proteina', 'Proteylac', 'Pura+',
        'Quaker', 'Red Bull', 'Redireaders', 'Rela', 'Rikesa', 'Rodillera',
        'Ruffles', 'Sam Mills Classic', 'Saneta', 'Schar', 'Schick',
        'Seles FC Pharma', 'Sigvaris', 'Silkplast', 'Simply7', 'Sinus Rinse',
        'Snack', 'Soporte', 'Splenda', 'Sport', 'Sports', 'Starbucks',
        'Steripharm', 'Steripharma', 'Steritex', 'Stevia', 'Sugar',
        'Sumpco', 'Supplement', 'Suplemento', 'Sweetest', 'Tang',
        'Tapones', 'Te', 'Tea', 'Tena', 'The Pod Snacks', 'Therma',
        'Tobillera', 'Tostadas', 'Tostitos', 'Trident', 'Truvia',
        'Turmeric', 'Under Armour', 'Vaseline', 'Venda', 'Vibra',
        'Victorias Natural Foods', 'Vilay', 'Vinagre', 'Vision',
        'Vitae', 'Vitamin', 'Vitamina', 'VPD', 'VPD Cleany', 'VPD Dovant',
        'VPD Dynamics', 'VPD JHC Medica', 'VPD Next Step', 'Whey',
        'Wilson', 'Wipala', 'Yoffi', 'Yogranola', 'Yukery', 'Zafire Labs',
        'Zaki', 'Ziel Pharma', 'Ziploc', 'Zoriak', 'Zukati', 'Zuviss', 'Zuzu'
    )
)
-- Delete dependent tables
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
