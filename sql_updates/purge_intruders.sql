-- Purge Intruder Brands (Non-Pharmaceutical)
-- This script deletes products belonging to brands identified as Sport, Food, or Misc.

DELETE FROM products WHERE brand IN (
    '1230', '2 Fit', '2008M-0008623', '3P', 'About Time', 'Albanese', 'All Pro', 
    'America Organica', 'América Orgánica', 'Andean Food', 'Apolo', 'Apolo III', 
    'Arco Iris', 'Arcoiris', 'Arizona', 'Ask', 'ASK', 'Avelina', 'Bailarina', 
    'Barilla', 'Beauty Sleep', 'Best Choice', 'Cargill', 'Chef', 'Conair', 
    'Copalis', 'Damel', 'Del Monte', 'Diablitos', 'Dr. Brown''s', 'Ebben', 
    'El Jarillo', 'Energizer', 'Equal', 'Everlast', 'Gatorade', 'Gillette', 
    'Golden', 'Heinz', 'Helios', 'Jogger', 'K6', 'Kellogg''s', 'Kx', 'KX', 
    'Lindt', 'Lipton', 'Maggi', 'Maizena', 'Mavesa', 'McCormick', 'Naturgourmet', 
    'Natulac', 'Nestle', 'Nike', 'Nivea', 'Oreo', 'Oscar Mayer', 'Pampers', 
    'Pepsi', 'Planters', 'Pringles', 'Quaker', 'Red Bull', 'Rikesa', 'Ruffles', 
    'Schar', 'Schick', 'Simply7', 'Snack', 'Splenda', 'Starbucks', 'Stevia', 
    'Tang', 'The Pod Snacks', 'Tostadas', 'Tostitos', 'Trident', 'Truvia', 
    'Under Armour', 'Vaseline', 'Wilson', 'Yoffi', 'Yogranola', 'Yukery', 
    'Ziploc', 'Zuviss', 'Sport', 'Sports', 'Genia Care'
);

-- Count remaining
SELECT count(*) as products_remaining FROM products;
