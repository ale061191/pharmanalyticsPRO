import { NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer';
import { supabase } from '@/lib/supabaseClient';

// Venezuela major cities for multi-location scraping
const LOCATIONS = [
    { city: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
    { city: 'Maracaibo', latitude: 10.6666, longitude: -71.6124 },
    { city: 'Valencia', latitude: 10.1579, longitude: -67.9972 },
    { city: 'Barquisimeto', latitude: 10.0678, longitude: -69.3474 },
    { city: 'Maracay', latitude: 10.2469, longitude: -67.5958 },
    { city: 'Puerto La Cruz', latitude: 10.2146, longitude: -64.6297 }
];

// Rotating User Agents
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const randomDelay = (min: number, max: number) =>
    new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

interface StockResult {
    city: string;
    stock_count: number;
    price: number | null;
}

async function scrapeProductForLocation(
    browser: Browser,
    productUrl: string,
    location: typeof LOCATIONS[0]
): Promise<StockResult> {
    const page = await browser.newPage();

    try {
        // Anti-detection setup
        const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        await page.setUserAgent(randomUA);

        await page.setViewport({
            width: 1920 + Math.floor(Math.random() * 100),
            height: 1080 + Math.floor(Math.random() * 100)
        });

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        });

        // Set geolocation for this city
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.farmatodo.com.ve', ['geolocation']);
        await page.setGeolocation({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: 100
        });

        // Block heavy resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`📍 Scraping ${location.city}...`);
        await randomDelay(300, 800);

        try {
            await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch {
            console.warn(`⚠️ Timeout for ${location.city}, extracting available data...`);
        }

        // Wait for hydration
        try {
            await page.waitForFunction(() => {
                return document.body.innerText.includes('Bs') ||
                    document.querySelector('[class*="price"]');
            }, { timeout: 8000 });
        } catch {
            // Continue anyway
        }

        await randomDelay(200, 500);

        // Extract stock and price
        const result = await page.evaluate(() => {
            // Price extraction
            let price: number | null = null;
            const priceSelectors = [
                '.product-purchase__price--active',
                '.product-purchase__price',
                '[class*="price"]'
            ];
            for (const sel of priceSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    const match = el.textContent.match(/[\d.,]+/);
                    if (match) {
                        let numStr = match[0];
                        if (numStr.includes('.') && numStr.includes(',')) {
                            numStr = numStr.replace(/\./g, '').replace(',', '.');
                        } else if (numStr.includes(',')) {
                            numStr = numStr.replace(',', '.');
                        }
                        price = parseFloat(numStr);
                        if (!isNaN(price) && price > 0) break;
                    }
                }
            }

            // Stock extraction - look for unit counts
            let stockCount = 0;
            const allElements = Array.from(document.querySelectorAll('div, p, span, li'));
            for (const el of allElements) {
                if (el.childElementCount === 0 && el.textContent) {
                    const match = el.textContent.match(/(\d+)\s*(unid|disponibl)/i);
                    if (match && match[1]) {
                        stockCount += parseInt(match[1], 10);
                    }
                }
            }

            // Fallback: if add button exists, assume at least 1
            if (stockCount === 0) {
                const hasAddBtn = !!document.querySelector('.product-purchase__add-btn') ||
                    !!document.querySelector('button[class*="add"]');
                if (hasAddBtn) stockCount = 1;
            }

            return { price, stock_count: stockCount };
        });

        return {
            city: location.city,
            stock_count: result.stock_count,
            price: result.price
        };

    } catch (error) {
        console.error(`❌ Error scraping ${location.city}:`, error);
        return { city: location.city, stock_count: 0, price: null };
    } finally {
        await page.close();
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { product_url, product_name } = body;

        if (!product_url) {
            return NextResponse.json({ error: 'product_url is required' }, { status: 400 });
        }

        console.log('🚀 Starting multi-city stock scrape...');

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        try {
            // Scrape 3 cities in parallel (balance between speed and resources)
            const results: StockResult[] = [];

            for (let i = 0; i < LOCATIONS.length; i += 3) {
                const batch = LOCATIONS.slice(i, i + 3);
                const batchResults = await Promise.all(
                    batch.map(loc => scrapeProductForLocation(browser, product_url, loc))
                );
                results.push(...batchResults);

                // Small delay between batches
                if (i + 3 < LOCATIONS.length) {
                    await randomDelay(500, 1000);
                }
            }

            // Calculate totals
            const totalStock = results.reduce((sum, r) => sum + r.stock_count, 0);
            const avgPrice = results.filter(r => r.price).reduce((sum, r, _, arr) =>
                sum + (r.price || 0) / arr.length, 0);

            console.log(`📊 Multi-city results: Total stock: ${totalStock}, Avg price: ${avgPrice}`);

            // Save to stock_history
            const resolvedProductName = product_name || product_url.split('/').pop() || 'Unknown';

            const historyEntries = results.map(r => ({
                product_name: resolvedProductName,
                city: r.city,
                stock_count: r.stock_count
            }));

            const { error: dbError } = await supabase
                .from('stock_history')
                .insert(historyEntries);

            if (dbError) {
                console.error('Supabase stock_history error:', dbError);
            }

            return NextResponse.json({
                success: true,
                product_name: resolvedProductName,
                data: results,
                summary: {
                    total_stock: totalStock,
                    avg_price: avgPrice || null,
                    cities_scraped: results.length
                },
                timestamp: new Date().toISOString()
            });

        } finally {
            await browser.close();
            console.log('🔒 Browser closed');
        }

    } catch (error: any) {
        console.error('🔥 Critical error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
