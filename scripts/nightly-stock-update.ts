#!/usr/bin/env node
/**
 * Nightly Stock Update Job
 * 
 * Runs between 2am-6am to update stock for all products
 * Uses parallel workers for efficiency while respecting rate limits
 * 
 * Usage:
 *   npx ts-node scripts/nightly-stock-update.ts
 *   
 * Or with Node:
 *   node scripts/nightly-stock-update.js
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Configuration
const CONFIG = {
    // Worker settings
    WORKERS: 5,              // Parallel workers (adjust based on resources)
    BATCH_SIZE: 50,          // Products per batch

    // Rate limiting
    MIN_DELAY_MS: 2000,      // Minimum delay between requests
    MAX_DELAY_MS: 4000,      // Maximum delay between requests
    SESSION_ROTATE: 15,      // Rotate session every N products

    // Timeouts
    PAGE_TIMEOUT: 45000,     // Page load timeout
    SCRAPE_TIMEOUT: 30000,   // Scrape extraction timeout

    // Operating hours (24h format, Venezuela time GMT-4)
    START_HOUR: 2,
    END_HOUR: 6,

    // Supabase
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

    // Priority levels
    PRIORITIES: {
        HIGH: 1,    // Every night
        MEDIUM: 2,  // Every 2 nights
        LOW: 3,     // Every 3 nights
    },
};

// User agents for rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

// Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Stats tracking
const stats = {
    started: new Date(),
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    totalStock: 0,
    errors: [] as string[],
};

/**
 * Human-like delay
 */
async function humanDelay(min = CONFIG.MIN_DELAY_MS, max = CONFIG.MAX_DELAY_MS): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get products to scrape based on priority
 */
async function getProductsToScrape(): Promise<any[]> {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    // Get products from database
    const { data, error } = await supabase
        .from('products')
        .select('id, product_url, name, priority, last_scraped')
        .order('priority', { ascending: true })
        .order('last_scraped', { ascending: true, nullsFirst: true });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    // Filter by priority schedule
    return (data || []).filter(product => {
        const priority = product.priority || CONFIG.PRIORITIES.MEDIUM;

        // HIGH priority: every night
        if (priority === CONFIG.PRIORITIES.HIGH) return true;

        // MEDIUM priority: every 2 nights
        if (priority === CONFIG.PRIORITIES.MEDIUM) return dayOfYear % 2 === 0;

        // LOW priority: every 3 nights
        return dayOfYear % 3 === 0;
    });
}

/**
 * Get products from queue
 */
async function getQueuedProducts(): Promise<any[]> {
    const { data, error } = await supabase
        .from('scrape_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(500);

    if (error) {
        console.error('Error fetching queue:', error);
        return [];
    }

    return data || [];
}

/**
 * Scrape a single product
 */
async function scrapeProduct(
    browser: Browser,
    product: any,
    workerId: number
): Promise<boolean> {
    let page: Page | null = null;

    try {
        const productUrl = product.product_url;
        if (!productUrl) {
            console.log(`  [Worker ${workerId}] No URL for product ${product.id}`);
            return false;
        }

        // Create new page with random user agent
        page = await browser.newPage();
        await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-VE,es;q=0.9',
        });

        // Navigate
        console.log(`  [Worker ${workerId}] Scraping: ${productUrl.substring(0, 60)}...`);
        await page.goto(productUrl, {
            waitUntil: 'networkidle2',
            timeout: CONFIG.PAGE_TIMEOUT
        });

        await humanDelay(1000, 2000);

        // Scroll to load content
        await page.evaluate(() => {
            window.scrollBy(0, 500);
        });
        await humanDelay(500, 1000);

        // Try to scroll to availability section
        await page.evaluate(() => {
            const container = document.querySelector('.content-cities');
            if (container) container.scrollIntoView({ behavior: 'smooth' });
        });
        await humanDelay(1500, 2500);

        // Extract stock data
        const stockData = await page.evaluate(() => {
            const results: any[] = [];
            const allText = document.body.innerText;
            const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const stockMatch = line.match(/(\d+)\s*unid/i);

                if (stockMatch) {
                    // Try to get store name from context
                    let storeName = 'Unknown Store';
                    let city = 'Unknown City';

                    if (i >= 2) {
                        storeName = lines[i - 2];
                    }

                    results.push({
                        store_name: storeName.substring(0, 100),
                        stock_count: parseInt(stockMatch[1]),
                        raw_line: line.substring(0, 200),
                    });
                }
            }

            return results;
        });

        // Get product name
        const productName = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1?.textContent?.trim() || null;
        });

        // Save to database
        if (stockData.length > 0) {
            const entries = stockData.map(store => ({
                product_name: productName || product.name || 'Unknown',
                city: 'Venezuela', // Will be parsed from context
                sector: 'General',
                store_name: store.store_name,
                store_address: '',
                stock_count: store.stock_count,
                availability_status: store.stock_count > 50 ? 'high' : store.stock_count > 10 ? 'medium' : 'low',
                scraped_at: new Date().toISOString(),
            }));

            const { error: insertError } = await supabase
                .from('stock_detail')
                .insert(entries);

            if (insertError) {
                console.error(`  [Worker ${workerId}] DB Error:`, insertError.message);
            } else {
                const totalStock = stockData.reduce((sum, s) => sum + s.stock_count, 0);
                stats.totalStock += totalStock;
                console.log(`  [Worker ${workerId}] ✓ Saved ${entries.length} stores, ${totalStock} units`);
            }
        }

        // Update last_scraped
        if (product.id) {
            await supabase
                .from('products')
                .update({ last_scraped: new Date().toISOString() })
                .eq('id', product.id);
        }

        // Mark queue item as completed
        if (product.queue_id) {
            await supabase
                .from('scrape_queue')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', product.queue_id);
        }

        stats.successful++;
        return true;

    } catch (error: any) {
        console.error(`  [Worker ${workerId}] Error: ${error.message}`);
        stats.errors.push(`${product.id || product.product_url}: ${error.message}`);
        stats.failed++;

        // Mark as failed in queue
        if (product.queue_id) {
            await supabase
                .from('scrape_queue')
                .update({ status: 'failed', error_message: error.message })
                .eq('id', product.queue_id);
        }

        return false;

    } finally {
        if (page) {
            await page.close().catch(() => { });
        }
        stats.processed++;
    }
}

/**
 * Worker function
 */
async function worker(
    workerId: number,
    products: any[],
    browser: Browser
): Promise<void> {
    console.log(`[Worker ${workerId}] Starting with ${products.length} products`);

    let sessionCount = 0;

    for (const product of products) {
        // Check time window
        const now = new Date();
        const hour = now.getHours();
        if (hour >= CONFIG.END_HOUR && hour < CONFIG.START_HOUR) {
            console.log(`[Worker ${workerId}] Outside operating hours, stopping`);
            break;
        }

        // Rate limiting
        await humanDelay();

        // Scrape
        await scrapeProduct(browser, product, workerId);

        sessionCount++;

        // Session rotation (close and reopen browser periodically)
        if (sessionCount >= CONFIG.SESSION_ROTATE) {
            console.log(`[Worker ${workerId}] Session rotation`);
            sessionCount = 0;
            await humanDelay(3000, 5000);
        }
    }

    console.log(`[Worker ${workerId}] Completed`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
    console.log('========================================');
    console.log('NIGHTLY STOCK UPDATE JOB');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Workers: ${CONFIG.WORKERS}`);
    console.log('========================================\n');

    // Check time window (allow override with --force)
    const forceRun = process.argv.includes('--force');
    const now = new Date();
    const hour = now.getHours();

    if (!forceRun && (hour < CONFIG.START_HOUR || hour >= CONFIG.END_HOUR)) {
        console.log(`⚠️  Outside operating hours (${CONFIG.START_HOUR}am-${CONFIG.END_HOUR}am)`);
        console.log('   Use --force to run anyway');
        process.exit(0);
    }

    // Get products
    console.log('[1] Fetching products...');
    let products = await getProductsToScrape();

    // Also get queued products
    const queued = await getQueuedProducts();
    console.log(`   Regular products: ${products.length}`);
    console.log(`   Queued products: ${queued.length}`);

    // Merge (queued items get higher priority)
    const queuedWithFlag = queued.map(q => ({ ...q, queue_id: q.id, id: null }));
    products = [...queuedWithFlag, ...products];

    if (products.length === 0) {
        console.log('No products to process');
        process.exit(0);
    }

    console.log(`[2] Total to process: ${products.length}\n`);

    // Split into worker batches
    const batchSize = Math.ceil(products.length / CONFIG.WORKERS);
    const batches: any[][] = [];

    for (let i = 0; i < CONFIG.WORKERS; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, products.length);
        if (start < products.length) {
            batches.push(products.slice(start, end));
        }
    }

    console.log(`[3] Launching ${batches.length} workers...\n`);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
        ],
    });

    try {
        // Run workers in parallel
        await Promise.all(
            batches.map((batch, index) => worker(index + 1, batch, browser))
        );

    } finally {
        await browser.close();
    }

    // Print summary
    const duration = (Date.now() - stats.started.getTime()) / 1000 / 60;

    console.log('\n========================================');
    console.log('JOB COMPLETED');
    console.log('========================================');
    console.log(`Duration: ${duration.toFixed(1)} minutes`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Total Stock Scraped: ${stats.totalStock.toLocaleString()} units`);

    if (stats.errors.length > 0) {
        console.log(`\nErrors (${stats.errors.length}):`);
        stats.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
        if (stats.errors.length > 10) {
            console.log(`  ... and ${stats.errors.length - 10} more`);
        }
    }

    console.log('\n✅ Done');
    process.exit(0);
}

// Run
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
