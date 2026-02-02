-- Purge Phase 5: EXTREME PURGE (The "Chocotella" Cleanup)
-- Deleting all identified non-pharmaceutical intruders.

WITH products_to_delete AS (
    SELECT id FROM products WHERE brand IN (
        -- BATCH 1 (A-M) - Intruders
        'Acua-e', 'Aireld', 'Alco', 'Amy', 'Anzoategui', 'Apex Group', 'Arnet', 'Avpharma', 
        'Balaxi', 'Balker', 'Benefic Uomo', 'Bing Zun', 'Bliss', 'Blister', 'Botica Casera', 'Bral Biotech', 
        'Casabe', 'Chacon', 'Chacon Romero', 'Champions Ship Wilson', 'Chicco', 'Chocotella', 'Ciclismo', 
        'Club Arepa', 'Comprimidos', 'Conaircomfort', 'Corpus', 'Daily', 'Dencorub', 'Desconocido', 
        'DollyFarma', 'Dorado', 'Dulcilight', 'Ecobenefit', 'Edellafit', 'El Valle Premium', 'El Valle Supreme', 
        'Endolce', 'Ensure', 'Enterex Protical', 'Farmers', 'Fisiolin Oftalmi', 'Fitex', 'Fitness Delta', 'Flents', 
        'Forma', 'Forma Elastica', 'Forma Elástica', 'Formula', 'Free Life Style', 'Frusnack', 'Frutilike', 
        'Gambaletto', 'Garcinia Cambogia', 'Generic', 'Generico de Calidad', 'Giniwa M', 'Gluten Fri', 'Glutenfri', 
        'Going Endurance', 'Goli', 'Grupo Cashew', 'Grupo Cleanup', 'H&M', 'H2off', 'Happy Kids', 'Hermesetas', 
        'Hola Granola', 'Jogger Ad', 'Jogger Trimmer', 'Kalan Krunch', 'Kangooplus', 'Klim', 'La', 
        'La Encantada Colmenita', 'La Encantada Panalito', 'La Molisana', 'La Piel', 'La Sante', 'Lactovisoy', 
        'Leon Sport', 'Magic Honey', 'Makea', 'Mi Última Dieta', 'Muscle Granola', 'My', 'Nat', 'Naturales', 
        'Naturalyst', 'Nature Valley', 'Natures Hollow', 'None',

        -- BATCH 2 (N-Z) - Intruders
        'Naturlistik', 'Naturlife''s', 'Naturlifes', 'Next Step', 'Ninazo Farma', 'Nio Pharmaceutical', 'Nnova', 
        'Novhepar', 'NuGo', 'Nugo', 'Nunu', 'NutraDose', 'Nutracort', 'Nutradition', 'Nutragum', 'Nutri-Defen', 
        'NutriClara', 'Nutrigamma', 'Ochamatcha', 'Oh Snack', 'OlioVita Vitae', 'Onco Plus', 'Oral', 'Ostin', 
        'Otras', 'P&G', 'PL', 'Pan', 'Pancake Fit', 'Pancake Kids', 'Pantera', 'Pasta Oro', 'Pastezinc', 'Pastillas', 
        'Pediasure', 'Pediatrica', 'Pediplus', 'Pentamag', 'Performance', 'Pharma KT', 'Pharma Kt', 'Pharmacorp', 
        'Pharmalast Cure Aid Plester', 'Pharmamed', 'Pharmamerican', 'Pharmatech', 'Pharmatique', 'Pharmator', 
        'Pharmetique Consumo', 'Phoenix', 'Platsiderm', 'Plenia', 'PlusAndex', 'Plusandex', 'Poen', 'Polantac', 
        'Politecnicos', 'Portugal', 'Powerful', 'Praome-Es', 'Pregalis CAI', 'Premium', 'Prism', 'Pro Bar', 'Prokal', 
        'Protech Telelinks', 'Protechs Seal-Rite', 'Provim', 'Proyecto Nueva Vida', 'Pulplus', 'Pure Soy', 'Pureza', 
        'Pureza Original', 'Pureza Teens', 'Puritan´s Pride', 'Que Bites', 'Quest', 'Quim Far', 'Quim-Far', 
        'Quinoa Club', 'R600', 'R650', 'RecetteMark', 'Reliance', 'Remeny', 'Representaciones GVR, C.A', 'Ricarda', 
        'Ricola', 'Right Gear', 'Rinaris', 'Rogastril', 'Ronamedic', 'Ronava', 'Rowe', 'SGG', 'Saito', 'Sanavita', 
        'Sanavital', 'Santa Teresa', 'Santiveri', 'Scotti', 'Sensibly Natural', 'Servitalento', 'Servivita', 'Shalina', 
        'Shuangyou', 'Sigvaris DYNAVEN', 'Sildex PlusAndex', 'Simply Chips', 'Sin Gluten Heaven', 'Singrass', 
        'Skinny Sweet', 'Soma', 'Soto Global Group', 'Spermotrend', 'Spervend', 'Stevian Forte', 'Super Clinica', 
        'Super Crystal', 'Tachigrip', 'Tensomax', 'Terraloe', 'Tiares', 'Trixate GP Pharma', 'Truvia Cargill', 
        'Uniphar', 'Urolprot Advanced', 'V-Balanced', 'Valmorca', 'Variplant', 'Varity Labs', 'Varitylabs By Falidu', 
        'Vendapress', 'Vick', 'Vincenti', 'Visciano', 'Vision Vitamins', 'Vitadyn', 'Vitafer-L', 'VItahelp', 'Vitybell', 
        'Viusid', 'Vivax', 'Vivo', 'Volk', 'Vult O', 'Vult O Boticario', 'Wampole', 'Wepa', 'Xiodine', 'YYC', 'Zuoz', 
        'Ñam'
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
