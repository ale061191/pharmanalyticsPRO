/**
 * Stealth Scraper Library for Farmatodo
 * Anti-detection measures for reliable scraping
 * 
 * Features:
 * - User-Agent rotation
 * - Human-like delays
 * - Fingerprint evasion
 * - Rate limiting with exponential backoff
 * - Session management
 */

import puppeteer, { Browser, Page } from 'puppeteer';

// 15+ Real User Agents for rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 OPR/102.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

// Venezuelan coordinates for geolocation
const VE_LOCATIONS = [
    { latitude: 10.4806, longitude: -66.9036, city: 'Caracas' },
    { latitude: 10.0678, longitude: -69.3467, city: 'Barquisimeto' },
    { latitude: 10.1579, longitude: -67.9972, city: 'Valencia' },
    { latitude: 10.6652, longitude: -71.6198, city: 'Maracaibo' },
    { latitude: 10.2437, longitude: -67.5974, city: 'Maracay' },
];

interface ScraperConfig {
    headless?: boolean;
    timeout?: number;
    maxRetries?: number;
    minDelay?: number;
    maxDelay?: number;
    proxyUrl?: string;
}

interface ScrapeResult {
    success: boolean;
    data: any;
    error?: string;
    duration: number;
    retries: number;
}

export class StealthScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private config: Required<ScraperConfig>;
    private requestCount = 0;
    private lastRequestTime = 0;
    private sessionRequestCount = 0;
    private currentUserAgent: string;
    private currentLocation: typeof VE_LOCATIONS[0];

    constructor(config: ScraperConfig = {}) {
        this.config = {
            headless: config.headless ?? true,
            timeout: config.timeout ?? 60000,
            maxRetries: config.maxRetries ?? 3,
            minDelay: config.minDelay ?? 1500,
            maxDelay: config.maxDelay ?? 3500,
            proxyUrl: config.proxyUrl ?? '',
        };

        this.currentUserAgent = this.getRandomUserAgent();
        this.currentLocation = this.getRandomLocation();
    }

    /**
     * Get random user agent from pool
     */
    private getRandomUserAgent(): string {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    /**
     * Get random Venezuelan location
     */
    private getRandomLocation(): typeof VE_LOCATIONS[0] {
        return VE_LOCATIONS[Math.floor(Math.random() * VE_LOCATIONS.length)];
    }

    /**
     * Human-like delay with gaussian distribution
     */
    async humanDelay(min?: number, max?: number): Promise<void> {
        const minMs = min ?? this.config.minDelay;
        const maxMs = max ?? this.config.maxDelay;

        // Gaussian-like distribution (box-muller approximation)
        const u1 = Math.random();
        const u2 = Math.random();
        const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        // Map to our range with center at middle
        const center = (minMs + maxMs) / 2;
        const range = (maxMs - minMs) / 4;
        const delay = Math.max(minMs, Math.min(maxMs, center + gaussian * range));

        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Rate limiting with exponential backoff
     */
    async respectRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        // Minimum 1.5 seconds between requests
        if (timeSinceLastRequest < 1500) {
            await new Promise(resolve => setTimeout(resolve, 1500 - timeSinceLastRequest));
        }

        // After 50 requests, add extra delay
        if (this.requestCount > 50 && this.requestCount % 10 === 0) {
            console.log(`[StealthScraper] Rate limit pause: ${this.requestCount} requests`);
            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    /**
     * Initialize browser with stealth settings
     */
    async init(): Promise<void> {
        if (this.browser) return;

        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--start-maximized',
        ];

        if (this.config.proxyUrl) {
            args.push(`--proxy-server=${this.config.proxyUrl}`);
        }

        this.browser = await puppeteer.launch({
            headless: this.config.headless,
            args,
        });

        await this.createNewPage();
    }

    /**
     * Create new page with stealth configuration
     */
    private async createNewPage(): Promise<void> {
        if (!this.browser) throw new Error('Browser not initialized');

        this.page = await this.browser.newPage();

        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Set user agent
        await this.page.setUserAgent(this.currentUserAgent);

        // Set extra headers
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        });

        // Set geolocation
        const context = this.browser.defaultBrowserContext();
        await context.overridePermissions('https://www.farmatodo.com.ve', ['geolocation']);
        await this.page.setGeolocation({
            latitude: this.currentLocation.latitude,
            longitude: this.currentLocation.longitude,
            accuracy: 100,
        });

        // Evade webdriver detection
        await this.page.evaluateOnNewDocument(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['es-VE', 'es', 'en-US', 'en'],
            });

            // Mock platform
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32',
            });

            // Hide automation indicators
            // @ts-ignore
            window.chrome = { runtime: {} };

            // Disable automation console message
            const originalConsole = console.debug;
            console.debug = (...args) => {
                if (args[0]?.includes?.('puppeteer')) return;
                originalConsole.apply(console, args);
            };
        });

        this.sessionRequestCount = 0;
    }

    /**
     * Rotate session (new page with new fingerprint)
     */
    async rotateSession(): Promise<void> {
        if (this.page) {
            await this.page.close();
        }

        // New fingerprint
        this.currentUserAgent = this.getRandomUserAgent();
        this.currentLocation = this.getRandomLocation();

        await this.createNewPage();
        console.log(`[StealthScraper] Session rotated: ${this.currentLocation.city}`);
    }

    /**
     * Human-like scrolling
     */
    async humanScroll(): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');

        // Random number of scrolls
        const scrollCount = 3 + Math.floor(Math.random() * 5);

        for (let i = 0; i < scrollCount; i++) {
            const scrollAmount = 300 + Math.floor(Math.random() * 400);
            await this.page.evaluate((amount) => {
                window.scrollBy({ top: amount, behavior: 'smooth' });
            }, scrollAmount);

            await this.humanDelay(200, 500);
        }
    }

    /**
     * Check if we're blocked
     */
    async isBlocked(): Promise<boolean> {
        if (!this.page) return false;

        const content = await this.page.content();
        const blockedIndicators = [
            'access denied',
            'blocked',
            'captcha',
            'robot',
            'unusual traffic',
            'too many requests',
            '403',
            '429',
        ];

        const lowerContent = content.toLowerCase();
        return blockedIndicators.some(indicator => lowerContent.includes(indicator));
    }

    /**
     * Navigate to URL with retry logic
     */
    async navigate(url: string): Promise<boolean> {
        if (!this.page) throw new Error('Page not initialized');

        await this.respectRateLimit();

        let retries = 0;
        while (retries < this.config.maxRetries) {
            try {
                await this.page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: this.config.timeout,
                });

                // Check for blocks
                if (await this.isBlocked()) {
                    console.log(`[StealthScraper] Blocked detected, retrying...`);
                    await this.rotateSession();
                    retries++;
                    await this.humanDelay(5000, 10000);
                    continue;
                }

                return true;

            } catch (error: any) {
                console.log(`[StealthScraper] Navigation error: ${error.message}`);
                retries++;

                if (retries < this.config.maxRetries) {
                    // Exponential backoff
                    const backoff = Math.pow(2, retries) * 1000;
                    await new Promise(resolve => setTimeout(resolve, backoff));
                }
            }
        }

        return false;
    }

    /**
     * Extract stock data from Farmatodo product page
     */
    async extractStoreStock(productUrl: string): Promise<ScrapeResult> {
        const startTime = Date.now();
        let retries = 0;

        try {
            await this.init();

            // Rotate session every 20 products
            this.sessionRequestCount++;
            if (this.sessionRequestCount > 20) {
                await this.rotateSession();
            }

            // Navigate
            const navigated = await this.navigate(productUrl);
            if (!navigated) {
                return {
                    success: false,
                    data: null,
                    error: 'Failed to navigate after retries',
                    duration: Date.now() - startTime,
                    retries,
                };
            }

            // Human-like scroll to availability section
            await this.humanScroll();
            await this.humanDelay();

            // Try to find and click on availability section
            if (!this.page) throw new Error('Page not initialized');

            await this.page.evaluate(() => {
                const container = document.querySelector('.content-cities');
                if (container) container.scrollIntoView({ behavior: 'smooth' });
            });

            await this.humanDelay(1000, 2000);

            // Extract stock data
            const stockData = await this.page.evaluate(() => {
                const results: any[] = [];
                const allText = document.body.innerText;
                const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const stockMatch = line.match(/(\d+)\s*unid/i);

                    if (stockMatch) {
                        let context: string[] = [];
                        for (let j = Math.max(0, i - 3); j <= i; j++) {
                            context.push(lines[j]);
                        }

                        results.push({
                            stock: parseInt(stockMatch[1]),
                            line: line,
                            context: context.join(' | ').substring(0, 250),
                        });
                    }
                }

                return results;
            });

            // Get product name
            const productName = await this.page.evaluate(() => {
                const h1 = document.querySelector('h1');
                return h1?.textContent?.trim() || null;
            });

            return {
                success: true,
                data: {
                    product_name: productName,
                    product_url: productUrl,
                    stores: stockData,
                    total_stock: stockData.reduce((sum: number, s: any) => sum + s.stock, 0),
                    store_count: stockData.length,
                    scraped_at: new Date().toISOString(),
                    location: this.currentLocation.city,
                },
                duration: Date.now() - startTime,
                retries,
            };

        } catch (error: any) {
            return {
                success: false,
                data: null,
                error: error.message,
                duration: Date.now() - startTime,
                retries,
            };
        }
    }

    /**
     * Cleanup
     */
    async close(): Promise<void> {
        if (this.page) await this.page.close().catch(() => { });
        if (this.browser) await this.browser.close().catch(() => { });
        this.page = null;
        this.browser = null;
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            totalRequests: this.requestCount,
            sessionRequests: this.sessionRequestCount,
            currentLocation: this.currentLocation.city,
            userAgent: this.currentUserAgent.substring(0, 50) + '...',
        };
    }
}

// Export singleton for reuse
let scraperInstance: StealthScraper | null = null;

export async function getStealthScraper(config?: ScraperConfig): Promise<StealthScraper> {
    if (!scraperInstance) {
        scraperInstance = new StealthScraper(config);
    }
    return scraperInstance;
}

export async function closeStealthScraper(): Promise<void> {
    if (scraperInstance) {
        await scraperInstance.close();
        scraperInstance = null;
    }
}
