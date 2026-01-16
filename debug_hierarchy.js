/**
 * debug_hierarchy.js
 * 
 * Inspects the full HTML structure of a product page to understand
 * how Ciudad → Municipio → Sucursal hierarchy is represented.
 */

require('dotenv').config({ path: '.env.local' });
const cheerio = require('cheerio');
const fs = require('fs');

const apiKey = process.env.FIRECRAWL_API_KEY;

async function debugHierarchy() {
    // Use a product URL that likely has multiple cities/branches
    const url = "https://www.farmatodo.com.ve/producto/acetaminofen-dolipral-forte-650-mg-x-10-tabletas";

    console.log(`\n🔍 Debugging Hierarchy for: ${url}\n`);

    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url: url,
                formats: ['html'],
                waitFor: 8000, // Wait for dynamic content
                timeout: 120000
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const html = data.data.html;

        // Save full HTML for manual inspection
        fs.writeFileSync('debug_hierarchy.html', html);
        console.log("✅ Full HTML saved to debug_hierarchy.html");

        const $ = cheerio.load(html);

        // --- Look for Ciudad/City elements ---
        console.log("\n=== CIUDADES (Cities) ===");
        const cityPatterns = [
            '.city-name', '.ciudad', '[class*="city"]', '[class*="ciudad"]',
            '.location-city', '.district-city'
        ];
        cityPatterns.forEach(sel => {
            const els = $(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel}: Found ${els.length} elements`);
                els.slice(0, 3).each((i, el) => console.log(`   - "${$(el).text().trim()}"`));
            }
        });

        // --- Look for Municipio elements ---
        console.log("\n=== MUNICIPIOS ===");
        const munPatterns = [
            '.municipio', '[class*="municipio"]', '.district', '[class*="district"]',
            '.text-district', '.location-district'
        ];
        munPatterns.forEach(sel => {
            const els = $(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel}: Found ${els.length} elements`);
                els.slice(0, 3).each((i, el) => console.log(`   - "${$(el).text().trim().substring(0, 50)}..."`));
            }
        });

        // --- Look for Sucursal/Branch elements ---
        console.log("\n=== SUCURSALES (Branches) ===");
        const branchPatterns = [
            '.sucursal', '[class*="sucursal"]', '.branch', '[class*="branch"]',
            '.store', '.tienda', '.stock-item', '[class*="stock"]'
        ];
        branchPatterns.forEach(sel => {
            const els = $(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel}: Found ${els.length} elements`);
                els.slice(0, 3).each((i, el) => console.log(`   - "${$(el).text().trim().substring(0, 80)}..."`));
            }
        });

        // --- Look for Stock/Units ---
        console.log("\n=== STOCK/UNIDADES ===");
        const stockPatterns = [
            '.text-stock-district', '.stock-count', '.stock-units', '.unidades',
            '[class*="stock"]', '[class*="unid"]'
        ];
        stockPatterns.forEach(sel => {
            const els = $(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel}: Found ${els.length} elements`);
                els.slice(0, 5).each((i, el) => console.log(`   - "${$(el).text().trim()}"`));
            }
        });

        // --- Look for accordion/collapsible structure (common for hierarchies) ---
        console.log("\n=== ACCORDION/EXPANDABLE STRUCTURE ===");
        const accordionPatterns = [
            '.accordion', '.collapse', '.expandable', '[class*="expand"]',
            '.panel', '.mat-expansion-panel', 'ngb-accordion'
        ];
        accordionPatterns.forEach(sel => {
            const els = $(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel}: Found ${els.length} elements`);
            }
        });

        // --- Search for "unid" text pattern ---
        console.log("\n=== SEARCHING FOR 'unid' TEXT ===");
        const bodyText = $('body').text();
        const unidMatches = bodyText.match(/\d+\s*unid/gi);
        if (unidMatches) {
            console.log(`Found ${unidMatches.length} 'unid' patterns:`);
            unidMatches.slice(0, 10).forEach(m => console.log(`   - "${m}"`));
        } else {
            console.log("❌ No 'unid' patterns found in visible text");
        }

        // --- Dump a sample of the body for manual review ---
        console.log("\n=== BODY SAMPLE (first 2000 chars) ===");
        console.log($('body').html().substring(0, 2000));

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

debugHierarchy();
