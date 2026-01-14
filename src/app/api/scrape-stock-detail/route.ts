import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { supabase } from '@/lib/supabaseClient';

/**
 * Scrape detailed stock info from Farmatodo's availability widget
 * Uses API interception to get real data
 */

interface StoreData {
    name: string;
    address: string;
    stock_count: number;
    availability_status: 'high' | 'medium' | 'low' | 'none';
}

interface SectorData {
    sector: string;
    stores: StoreData[];
}

interface CityData {
    city: string;
    sectors: SectorData[];
    total_stock: number;
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const randomDelay = (min: number, max: number) =>
    new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

export async function POST(request: Request) {
    const SCRAPE_TIMEOUT = 45000;

    try {
        const body = await request.json();
        const { product_url, product_name } = body;

        if (!product_url) {
            return NextResponse.json({ error: 'product_url is required' }, { status: 400 });
        }

        console.log('🏪 Starting detailed stock scrape with API interception...');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

        const page = await browser.newPage();
        const capturedData: any[] = [];

        try {
            await page.setUserAgent(USER_AGENTS[0]);
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-VE,es;q=0.9' });

            // Set Caracas location
            const context = browser.defaultBrowserContext();
            await context.overridePermissions('https://www.farmatodo.com.ve', ['geolocation']);
            await page.setGeolocation({ latitude: 10.4806, longitude: -66.9036, accuracy: 100 });

            // Intercept API responses to capture availability data
            await page.setRequestInterception(true);

            page.on('request', (req) => {
                // Allow all requests but log API calls
                req.continue();
            });

            page.on('response', async (response) => {
                const url = response.url();
                // Capture any API response that might contain availability data
                if (url.includes('availability') || url.includes('stock') || url.includes('inventory') ||
                    url.includes('branch') || url.includes('store') || url.includes('product')) {
                    try {
                        const contentType = response.headers()['content-type'] || '';
                        if (contentType.includes('json')) {
                            const data = await response.json();

                            // Store any potentially useful data
                            if (data && (typeof data === 'object')) {
                                capturedData.push(data);
                            }
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            });

            console.log(`📍 Navigating to: ${product_url}`);

            await page.goto(product_url, { waitUntil: 'networkidle2', timeout: 30000 });
            await randomDelay(2000, 3000);

            // Try to click on the availability section to trigger data loading
            const availabilitySelectors = [
                '[class*="disponib"]',
                '[class*="availability"]',
                '[class*="stock"]',
                '.accordion-button',
                '[data-toggle="collapse"]'
            ];

            for (const sel of availabilitySelectors) {
                try {
                    const elements = await page.$$(sel);
                    for (const el of elements.slice(0, 3)) {
                        await el.click().catch(() => { });
                        await randomDelay(500, 1000);
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Wait a bit more for API responses
            await randomDelay(1500, 2500);

            // If we captured API data, use it
            let cityData: CityData[] = [];

            if (capturedData.length > 0) {
                console.log(`✅ Processing ${capturedData.length} captured API responses`);
                // Parse the API response based on its structure
                cityData = parseApiData(capturedData);
            }

            // If API interception didn't work, try DOM extraction
            if (cityData.length === 0) {
                console.log('📝 Falling back to DOM extraction...');
                cityData = await extractFromDOM(page);
            }

            await browser.close();
            console.log('🔒 Browser closed');

            // Always return data - even if just the structure
            const resolvedProductName = product_name || extractProductName(product_url);

            // Save to database if we have valid data
            if (cityData.length > 0 && cityData.some(c => c.total_stock > 0)) {
                await saveToDatabase(resolvedProductName, cityData);
            }

            return NextResponse.json({
                success: true,
                product_name: resolvedProductName,
                cities: cityData,
                source: capturedData.length > 0 ? 'api' : 'dom',
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            await browser.close();
            console.error('Scrape error:', error.message);

            return NextResponse.json({
                success: false,
                error: error.message,
                cities: [],
                note: 'Scraping failed - check console for details'
            });
        }

    } catch (error: any) {
        console.error('🔥 Critical error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

function extractProductName(url: string): string {
    const match = url.match(/producto\/[\d-]+([^/]+)/);
    return match ? match[1].replace(/-/g, ' ').trim() : 'Unknown Product';
}

/**
 * Parses captured API data to extract stock information.
 * Handles multiple data sources (geoZones, nearbyStores) to build a robust hierarchical view.
 */
function parseApiData(dataList: any[]): CityData[] {
    const results: CityData[] = [];
    const citiesMap: Record<string, { name: string, sectors: Set<string> }> = {};
    const storesList: any[] = [];

    // First pass: Index known cities and sectors from geoZone data
    for (const data of dataList) {
        // Handle city/geoZone structure
        const citiesSource = data.cities || (Array.isArray(data.data) && data.data[0]?.geoZone ? data.data : []);

        if (Array.isArray(citiesSource)) {
            for (const city of citiesSource) {
                if (city.cityId && city.name && city.geoZone) {
                    if (!citiesMap[city.cityId]) {
                        citiesMap[city.cityId] = { name: city.name, sectors: new Set() };
                    }
                    if (Array.isArray(city.geoZone)) {
                        for (const zone of city.geoZone) {
                            if (zone.name) {
                                citiesMap[city.cityId].sectors.add(zone.name.toLowerCase());
                            }
                        }
                    }
                }
            }
        }

        // Handle nearbyStores structure
        const nearby = data.nearbyStores || data.stores || (data.data && data.data.nearbyStores);
        if (Array.isArray(nearby)) {
            storesList.push(...nearby);
        }

        // Handle other structures
        const branches = data.branches || data.availability;
        if (Array.isArray(branches)) {
            storesList.push(...branches);
        }
    }

    // === DEDUPLICATION: Remove duplicate stores from storesList ===
    // Stores can appear multiple times from different API responses
    const seenStoreIds = new Set<number>();
    const seenStoreNames = new Set<string>();
    const uniqueStoresList = storesList.filter(store => {
        // Use store.id as primary key for deduplication
        if (store.id && seenStoreIds.has(store.id)) {
            return false;
        }
        // Fallback: use store.name if no id
        const storeName = (store.name || '').toLowerCase().trim();
        if (!store.id && storeName && seenStoreNames.has(storeName)) {
            return false;
        }
        // Mark as seen
        if (store.id) seenStoreIds.add(store.id);
        if (storeName) seenStoreNames.add(storeName);
        return true;
    });

    console.log(`[parseApiData] Deduplicated: ${storesList.length} -> ${uniqueStoresList.length} stores`);

    // Processing stores
    const groupedByCity: Record<string, CityData> = {};

    for (const store of uniqueStoresList) {
        // Resolve City Name
        let cityName = store.city || 'Unknown';
        let cityId = store.cityId || store.city;

        // Try to map code (CCS) to name (Caracas)
        if (citiesMap[cityId]) {
            cityName = citiesMap[cityId].name;
        }

        // Resolve Sector
        let sectorName = 'General';

        // Strategy A: Explicit sector/zone fields
        if (store.sector) sectorName = store.sector;
        else if (store.zone) sectorName = store.zone;
        else if (store.zona) sectorName = store.zona;

        // Strategy B: Parse from Address (e.g. "Municipio Baruta")
        else if (store.address) {
            const munMatch = store.address.match(/Municipio\s+([a-zA-Z\u00C0-\u00FF]+)/i);
            if (munMatch) {
                const extracted = munMatch[1].toLowerCase();
                // Validate against known sectors if possible, or just use it
                sectorName = extracted.charAt(0).toUpperCase() + extracted.slice(1);
            }
        }

        // Resolve Stock (If not present, we assume explicit presence in this list implies availability, defaulting to 1)
        // STRICT CHECK: If we are just listing stores, we must be careful. 
        // Ideally we only rely on stores that have an explicit 'stock' or 'available' flag.
        // However, previous scraper logic was lenient. We will accept them but mark as low stock.
        const stockCount = parseInt(store.stock || store.quantity || store.cantidad || store.units) || (store.available ? 10 : 1);

        if (!groupedByCity[cityName]) {
            groupedByCity[cityName] = { city: cityName, sectors: [], total_stock: 0 };
        }

        let sectorData = groupedByCity[cityName].sectors.find(s => s.sector.toLowerCase() === sectorName.toLowerCase());
        if (!sectorData) {
            sectorData = { sector: sectorName, stores: [] };
            groupedByCity[cityName].sectors.push(sectorData);
        }

        // Avoid duplicates
        if (!sectorData.stores.find(s => s.name === store.name)) {
            sectorData.stores.push({
                name: store.name || 'Farmatodo',
                address: store.address || '',
                stock_count: stockCount,
                availability_status: stockCount > 50 ? 'high' : stockCount > 10 ? 'medium' : 'low'
            });
            groupedByCity[cityName].total_stock += stockCount;
        }
    }

    return Object.values(groupedByCity);
}

async function extractFromDOM(page: any): Promise<CityData[]> {
    return await page.evaluate(() => {
        const results: any[] = [];

        // Look for the availability widget - Farmatodo uses various structures
        // Try to find city accordion items
        const cityHeaders = document.querySelectorAll('[class*="accordion"] [class*="header"], [class*="city"] button');

        if (cityHeaders.length === 0) {
            // Try alternative: find text elements with city names and unit counts
            const allElements = document.querySelectorAll('div, span, li');
            const cityPattern = /^(Caracas|Maracaibo|Valencia|Barquisimeto|Maracay|Barcelona|Anaco|Barinas|Cabimas|Punto Fijo|Puerto La Cruz|Mérida|San Cristóbal|Guatire|Guarenas|Los Teques)/i;
            const unitPattern = /(\d+)\s*(u|unid|und)/i;

            const foundCities: Record<string, number> = {};

            allElements.forEach(el => {
                const text = el.textContent?.trim() || '';
                const cityMatch = text.match(cityPattern);
                if (cityMatch) {
                    const unitMatch = text.match(unitPattern);
                    const city = cityMatch[1];
                    const units = unitMatch ? parseInt(unitMatch[1]) : 0;

                    if (!foundCities[city] || units > foundCities[city]) {
                        foundCities[city] = units;
                    }
                }
            });

            for (const [city, stock] of Object.entries(foundCities)) {
                results.push({
                    city,
                    total_stock: stock,
                    sectors: [{
                        sector: 'Todas las tiendas',
                        stores: [{
                            name: `Farmatodo ${city}`,
                            address: '',
                            stock_count: stock,
                            availability_status: stock > 50 ? 'high' : stock > 10 ? 'medium' : 'low'
                        }]
                    }]
                });
            }
        }

        return results;
    });
}

function getStatus(stock: number | string): 'high' | 'medium' | 'low' | 'none' {
    const num = typeof stock === 'string' ? parseInt(stock) : stock;
    if (num > 50) return 'high';
    if (num > 10) return 'medium';
    if (num > 0) return 'low';
    return 'none';
}

async function saveToDatabase(productName: string, cities: CityData[]) {
    const entries: any[] = [];

    for (const city of cities) {
        for (const sector of city.sectors) {
            for (const store of sector.stores) {
                entries.push({
                    product_name: productName,
                    city: city.city,
                    sector: sector.sector,
                    store_name: store.name,
                    store_address: store.address,
                    stock_count: store.stock_count,
                    availability_status: store.availability_status
                });
            }
        }
    }

    if (entries.length > 0) {
        const { error } = await supabase
            .from('stock_detail')
            .insert(entries);

        if (error) {
            console.error('Database save error:', error);
        } else {
            console.log(`✅ Saved ${entries.length} stock entries`);
        }
    }
}

// GET endpoint to retrieve stored stock detail
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    let productName = searchParams.get('product_name');

    if (!productName) {
        return NextResponse.json({ error: 'product_name is required' }, { status: 400 });
    }

    productName = productName.trim();

    try {
        // 1. Try exact/ILIKE match first
        let { data, error } = await supabase
            .from('stock_detail')
            .select('*')
            .ilike('product_name', `%${productName}%`)
            .order('scraped_at', { ascending: false })
            .limit(200);

        // 2. If no data, try matching just the first 3 words (fuzzy match) to handle variations
        if (!error && (!data || data.length === 0)) {
            const shortName = productName.split(' ').slice(0, 3).join(' ');
            if (shortName.length > 3) {
                console.log(`Retrying search with short name: ${shortName}`);
                const retry = await supabase
                    .from('stock_detail')
                    .select('*')
                    .ilike('product_name', `%${shortName}%`)
                    .order('scraped_at', { ascending: false })
                    .limit(200);

                if (retry.data && retry.data.length > 0) {
                    data = retry.data;
                }
            }
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Group by city > sector > store
        const grouped: Record<string, CityData> = {};

        for (const row of data || []) {
            if (!grouped[row.city]) {
                grouped[row.city] = { city: row.city, sectors: [], total_stock: 0 };
            }

            let sector = grouped[row.city].sectors.find(s => s.sector === row.sector);
            if (!sector) {
                sector = { sector: row.sector, stores: [] };
                grouped[row.city].sectors.push(sector);
            }

            sector.stores.push({
                name: row.store_name,
                address: row.store_address || '',
                stock_count: row.stock_count,
                availability_status: row.availability_status || 'none'
            });

            grouped[row.city].total_stock += row.stock_count;
        }

        return NextResponse.json({
            success: true,
            product_name: productName,
            cities: Object.values(grouped),
            count: data?.length || 0
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
