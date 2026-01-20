
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function enrichVademecum() {
    console.log('Starting Vademecum Enrichment (Puppeteer/Desktop)...');

    // Launch browser once
    const browser = await puppeteer.launch({
        headless: true, // Keep headless true for background
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let totalProcessed = 0;
    const BATCH_SIZE = 50;

    while (true) {
        // Fetch products missing ATC code
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name')
            .is('atc_code', null)
            //.eq('category', 'Medicamentos') // Optional: uncomment if we only want drugs
            .order('id', { ascending: false })
            .limit(BATCH_SIZE);

        if (error) {
            console.error('Supabase error:', error);
            break;
        }

        if (!products || products.length === 0) {
            console.log('No more products to enrich.');
            break;
        }

        console.log(`Fetched batch of ${products.length} products.`);

        for (const product of products) {
            totalProcessed++;
            const url = `https://farmatodo.com.ve/producto/${product.id}`;
            console.log(`[${totalProcessed}] ${product.name} (${product.id})`);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

                // Human-like delay & scroll
                await new Promise(r => setTimeout(r, 3000));
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
                await new Promise(r => setTimeout(r, 2000));
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await new Promise(r => setTimeout(r, 2000));

                const text = await page.evaluate(() => document.body.innerText);

                // Extraction Logic
                // ATC: "ATC: J01MA02" or "Código ATC: J01MA02"
                // Active: "Principio Activo: CIPROFLOXACINO"

                // Improved Regex
                const atcMatch = text.match(/(?:ATC|Código ATC)[:\.\s]+([A-Z0-9]+)/i);
                const activeMatch = text.match(/(?:Principio Activo|Ingrediente Activo|Componente)[:\.\s]+([^\n\r]+)/i);

                const updates = {};
                let foundAny = false;

                if (atcMatch && atcMatch[1]) {
                    updates.atc_code = atcMatch[1].trim();
                    foundAny = true;
                    console.log(`  > ATC Found: ${updates.atc_code}`);
                }

                if (activeMatch && activeMatch[1]) {
                    updates.active_ingredient = activeMatch[1].trim();
                    foundAny = true;
                    console.log(`  > Active Found: ${updates.active_ingredient}`);
                }

                if (foundAny) {
                    const { error: updateError } = await supabase
                        .from('products')
                        .update(updates)
                        .eq('id', product.id);

                    if (updateError) console.error('  DB Update Error:', updateError.message);
                    else console.log('  DB Updated.');
                } else {
                    console.log('  No Vademecum data found.');
                    // Optional: Mark as "checked" to avoid retry loop?
                    // We can set atc_code = 'N/A' to prevent infinite loop.
                    await supabase.from('products').update({ atc_code: 'N/A' }).eq('id', product.id);
                }

            } catch (e) {
                console.error(`  Error: ${e.message}`);
            }
        }
    }

    await browser.close();
    console.log('Enrichment process finished.');
}

enrichVademecum();
