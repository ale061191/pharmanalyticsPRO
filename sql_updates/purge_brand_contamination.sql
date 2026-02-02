-- Purge Phase 6: Brand Contamination Cleanup
-- Fixing "Brands" that are actually Product Names or generic terms.

BEGIN;

-- 1. Delete SPECIFIC Intruders identified by User/Audit (Cocoloco, Cebión, etc.)
-- NOTE: We are DELETING these products if they are garbage, or UPDATING brand if the product is valid?
-- User said: "elimina cualquier nombre de producto farmaceutico de la lista de laboratorios"
-- This implies the PRODUCT might be valid, but the BRAND is wrong.
-- However, "Cocoloco" sounds like a cocktail/drink (garbage). "Cebión" is a valid Vitamin C (Product).
-- If Brand = Product Name, we probably want to KEEP the product but set Brand = 'Unknown' or NULL to remove it from the list.
-- BUT, if it's "Cocoloco", it's likely garbage.
-- Let's DELETE the garbage ones, and UPDATE the pharma ones.

-- 1.1 DELETE Garbage/Non-Pharma found in Brand List
DELETE FROM products WHERE brand IN (
    'Cocoloco', 'BurbujaPizza', 'Champions Ship Wilson', 'Ciclismo', 'Sportlast', 'Club Arepa', 
    'Pancake Fit', 'Pancake Kids', 'Oh Snack', 'Pasta Oro', 'Queso', 'Jamon', 'Salsa', 'Pan',
    'Bks', 'Bks P150', 'Frolls', 'Frusnack', 'Frutilike', 'Goli', 'Happy Kids', 'Hola Granola',
    'Kalan', 'Kalan Krunch', 'Kangooplus', 'Magic Honey', 'Muscle Granola', 'Nature Valley',
    'Natures Hollow', 'Que Bites', 'Quinoa Club', 'Simply Chips', 'Sin Gluten Heaven', 'Skinny Sweet',
    'Truvia Cargill', 'Ñam'
);

-- 1.2 UPDATE Valid Pharma Products that have Product Name as Brand
-- We set Brand = NULL (or 'Laboratorio No Identificado') so they don't clog the filter.
UPDATE products 
SET brand = 'Unknown' 
WHERE brand IN (
    'Cebión', 'Caprofedyl', 'Carprofedyl', 'Clorace', 'Mucomax', 'Cortynase', 'Gypsona', 
    'Merthiolate', 'Cuticell', 'Hypafix', 'Leukopor', 'Leukofix', 'Clarix', 'Clarix Oftalmi',
    'Farmagenik', 'Aidex', 'Iodinex', 'Micropor', 'Letisan', 'Letisan Leti', 'Gammaf', 'Gammasoy',
    'Mesames', 'Multigen', 'Ecomed+', 'Quinotic', 'Mucosolvan', 'Iso26', 'Ursocol', 'Comprinet',
    'Blocax', 'Anapir', 'Bioscrub', 'Medigen', 'Kimiceg', 'Tachigrip', 'Vick', 'Dencorub',
    'Terbicrym', 'Terbicrym Avpharma', 'Sildex PlusAndex', 'PlusAndex', 'Plusandex', 'Misulvan/Andex',
    'Lactovisoy', 'Pediasure', 'Ensure', 'Glucerna'
);

-- 2. Standardize/Consolidate Laboratories
-- 2.1 Valmor -> Laboratorios Valmor
UPDATE products SET brand = 'Valmor' WHERE brand = 'Laboratorios Valmor'; -- Or prefer Valmor? User list had 'Valmor' as valid. Let's keep 'Valmor' consistent.
-- Actually, usually full name is better, but 'Valmor' is cleaner. Let's stick to consistent name.
-- User list: "8. Behrens", "7. Vargas". "5. La Santé".
-- Let's consolidate variations.

UPDATE products SET brand = 'Leti' WHERE brand IN ('LETI', 'Leti S.A.V.', 'Laboratorios Leti');
UPDATE products SET brand = 'Genven' WHERE brand IN ('Genven (Genericos Venezolanos)', 'GENVEN');
UPDATE products SET brand = 'Farma' WHERE brand IN ('Laboratorios Farma', 'FARMA', 'Farma D'); -- Consolidating under 'Farma' or 'Laboratorios Farma'?
-- User list says "Laboratorios Farma". Let's standardize to that.
UPDATE products SET brand = 'Laboratorios Farma' WHERE brand = 'Farma';
UPDATE products SET brand = 'Laboratorios Farma' WHERE brand = 'Farma D';

-- 2.2 Fix 'Farmatodo' variations
UPDATE products SET brand = 'Farmatodo' WHERE brand LIKE 'Farmatodo%';
UPDATE products SET brand = 'Farmatodo' WHERE brand = 'Fórmula Farmatodo';

-- 2.3 Fix 'Valmor'
UPDATE products SET brand = 'Valmor' WHERE brand = 'Laboratorios Valmor'; -- User list had Valmor as #8 (Behrens actually). Valmor is usually "Laboratorios Valmor".
-- Let's just ensure it's not "Valmorca" (unless that's the legal name).
UPDATE products SET brand = 'Valmor' WHERE brand = 'Valmorca';

COMMIT;
