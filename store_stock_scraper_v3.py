"""
Farmatodo Complete Store Stock Scraper - 10/10 Edition V3
Uses Playwright to fully interact with product page map
to extract EXACT stock per store

Key insight: The store stock is shown in a popup when clicking on map markers
or in the city list as "XX unid" next to each store
"""
import asyncio
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout


class StoreStockScraperV3:
    def __init__(self, headless: bool = False):  # Use headed mode for debugging
        self.headless = headless
        self.playwright = None
        self.browser = None
        self.page = None
        
    async def start(self):
        """Initialize browser with stealth settings"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )
        context = await self.browser.new_context(
            viewport={'width': 1400, 'height': 1000},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='es-VE',
            geolocation={'latitude': 10.4823, 'longitude': -66.8459},
            permissions=['geolocation']
        )
        self.page = await context.new_page()
    
    async def close(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def extract_stock_from_page(self) -> list:
        """Extract all store stock info from current page DOM"""
        
        # Wait a bit for any lazy-loaded content
        await asyncio.sleep(1)
        
        # Try multiple extraction methods
        stores = []
        
        # Method 1: Look for stock text patterns in page
        stock_data = await self.page.evaluate('''() => {
            const results = [];
            const bodyText = document.body.innerText;
            
            // Pattern to find store + stock: "STORE NAME 25 unid" or similar
            const lines = bodyText.split('\\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Look for pattern with "unid" or "unidades"
                const stockMatch = line.match(/(\\d+)\\s*(unid|unidades)/i);
                if (stockMatch) {
                    // Get context - previous lines might have store name
                    const context = [];
                    for (let j = Math.max(0, i-2); j <= i; j++) {
                        context.push(lines[j].trim());
                    }
                    
                    results.push({
                        stock: parseInt(stockMatch[1]),
                        line: line,
                        context: context.join(' | ')
                    });
                }
            }
            
            return results;
        }''')
        
        for item in stock_data:
            stores.append({
                'stock': item['stock'],
                'raw': item['line'][:100],
                'context': item['context'][:200]
            })
        
        return stores
    
    async def scrape_product_stock(self, product_url: str) -> dict:
        """
        Main method to scrape stock per store for a product
        """
        result = {
            'product_url': product_url,
            'scraped_at': datetime.now().isoformat(),
            'product_name': None,
            'stores': [],
            'cities_scraped': [],
            'summary': {}
        }
        
        try:
            print(f"[1/7] Opening product page...")
            await self.page.goto(product_url, wait_until='domcontentloaded', timeout=60000)
            await asyncio.sleep(5)  # Wait for page to fully load
            
            # Get product name
            try:
                title = await self.page.locator('h1').first.text_content()
                result['product_name'] = title.strip() if title else None
                print(f"    Product: {result['product_name'][:50] if result['product_name'] else 'N/A'}...")
            except:
                pass
            
            print(f"[2/7] Scrolling to availability section...")
            # Scroll down to find the availability section
            await self.page.evaluate('window.scrollTo(0, 500)')
            await asyncio.sleep(1)
            
            # Try to find and scroll to the map section
            try:
                await self.page.locator('text=Disponibilidad en Farmatodo').scroll_into_view_if_needed(timeout=5000)
                await asyncio.sleep(1)
            except:
                print("    Could not find 'Disponibilidad' section, continuing...")
            
            print(f"[3/7] Looking for city selector...")
            # Find the city list
            cities = await self.page.evaluate('''() => {
                const cityLinks = document.querySelectorAll('[class*="content-cities"] a, [class*="city"] a');
                return Array.from(cityLinks).map(a => ({
                    text: a.textContent.trim(),
                    id: a.id || null
                })).filter(c => c.text.length > 1);
            }''')
            
            print(f"    Found {len(cities)} cities")
            
            print(f"[4/7] Clicking on cities to load store data...")
            
            # Extract initial stock data
            initial_stores = await self.extract_stock_from_page()
            print(f"    Initial extraction: {len(initial_stores)} stock entries")
            
            # Try clicking on some cities to trigger loading
            city_clicked = 0
            for city in cities[:5]:  # Click first 5 cities
                try:
                    city_link = await self.page.get_by_text(city['text'], exact=True).first
                    await city_link.click(timeout=2000)
                    await asyncio.sleep(1)
                    city_clicked += 1
                    result['cities_scraped'].append(city['text'])
                except:
                    continue
            
            print(f"    Clicked on {city_clicked} cities")
            
            print(f"[5/7] Clicking on map markers...")
            # Click on map markers to trigger popups
            markers_clicked = 0
            try:
                markers = await self.page.locator('.leaflet-marker-icon').all()
                print(f"    Found {len(markers)} map markers")
                
                for marker in markers[:10]:  # Click first 10 markers
                    try:
                        await marker.click(force=True, timeout=1500)
                        await asyncio.sleep(0.5)
                        markers_clicked += 1
                    except:
                        continue
            except:
                print("    No map markers found")
            
            print(f"    Clicked on {markers_clicked} markers")
            
            print(f"[6/7] Extracting store stock data...")
            # Final extraction after all interactions
            all_stores = await self.extract_stock_from_page()
            
            # Also try to get popup content if any
            popups = await self.page.evaluate('''() => {
                const popups = document.querySelectorAll('.leaflet-popup-content');
                return Array.from(popups).map(p => p.innerText.trim());
            }''')
            
            for popup in popups:
                if 'unid' in popup.lower():
                    match = re.search(r'(\d+)\s*unid', popup, re.IGNORECASE)
                    if match:
                        all_stores.append({
                            'stock': int(match.group(1)),
                            'raw': popup[:100],
                            'source': 'popup'
                        })
            
            # Deduplicate stores
            seen = set()
            unique_stores = []
            for store in all_stores:
                key = (store['stock'], store['raw'][:30])
                if key not in seen:
                    seen.add(key)
                    unique_stores.append(store)
            
            result['stores'] = unique_stores
            
            print(f"[7/7] Calculating summary...")
            total_stock = sum(s['stock'] for s in unique_stores)
            
            result['summary'] = {
                'stores_found': len(unique_stores),
                'total_stock': total_stock,
                'cities_scraped': len(result['cities_scraped']),
                'avg_stock_per_store': round(total_stock / len(unique_stores), 1) if unique_stores else 0
            }
            
            return result
            
        except Exception as e:
            import traceback
            result['error'] = str(e)
            result['traceback'] = traceback.format_exc()
            return result


async def main():
    """Test with a real product"""
    
    # Use a product URL that we know has availability data
    product_url = "https://www.farmatodo.com.ve/producto/113016367-acetaminofen-500mg-10tabletas"
    
    print("=" * 70)
    print("FARMATODO STORE STOCK SCRAPER V3 - 10/10 Edition")
    print("=" * 70)
    
    scraper = StoreStockScraperV3(headless=True)
    
    try:
        await scraper.start()
        print(f"\nTarget: {product_url}\n")
        
        result = await scraper.scrape_product_stock(product_url)
        
        print("\n" + "=" * 70)
        print("RESULTS")
        print("=" * 70)
        
        print(f"\nProduct: {result.get('product_name', 'N/A')}")
        
        summary = result.get('summary', {})
        print(f"\nSummary:")
        print(f"  Stores found: {summary.get('stores_found', 0)}")
        print(f"  Total stock: {summary.get('total_stock', 0)} units")
        print(f"  Cities scraped: {summary.get('cities_scraped', 0)}")
        
        stores = result.get('stores', [])
        if stores:
            print(f"\nStore Stock Details (First 15):")
            for i, store in enumerate(stores[:15], 1):
                print(f"  {i}. Stock: {store['stock']:3d} unid | {store['raw'][:60]}...")
        else:
            print("\n⚠️ No individual store stock extracted.")
            print("   The map popup method may need further refinement.")
        
        if result.get('error'):
            print(f"\nError: {result['error']}")
        
        # Save results
        output_file = "store_stock_v3.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\nFull results saved to: {output_file}")
        
    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())
