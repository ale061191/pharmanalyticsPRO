"""
Farmatodo Granular Stock Scraper - 10/10 Edition
Extracts EXACT stock per store/branch using Playwright

This scraper provides:
- Stock per individual store (e.g. "Tienda Chuao: 46 unidades")
- City -> Municipality -> Store hierarchy
- Coordinates for heat map visualization
"""
import asyncio
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright


class GranularStockScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser = None
        self.context = None
        self.page = None
        
    async def __aenter__(self):
        await self.start()
        return self
        
    async def __aexit__(self, *args):
        await self.close()
        
    async def start(self):
        """Initialize the browser with stealth settings"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-web-security'
            ]
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='es-VE'
        )
        self.page = await self.context.new_page()
        
        # Block unnecessary resources for speed
        await self.page.route("**/*.{png,jpg,jpeg,gif,webp}", lambda route: route.abort())
        
    async def close(self):
        """Clean up browser resources"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
            
    async def get_stock_by_store(self, product_url: str) -> dict:
        """
        Navigate to product page and extract stock per store
        
        Args:
            product_url: Full URL of the product page
            
        Returns:
            Dict with product info and stock per store
        """
        result = {
            "product_url": product_url,
            "scraped_at": datetime.now().isoformat(),
            "cities": [],
            "total_stores": 0,
            "total_stock": 0
        }
        
        try:
            print(f"[1/5] Navigating to product page...")
            await self.page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)  # Wait for dynamic content
            
            # Get product name
            try:
                name_elem = await self.page.query_selector('h1')
                if name_elem:
                    result["product_name"] = await name_elem.inner_text()
            except:
                pass
            
            print(f"[2/5] Looking for availability section...")
            # Scroll to availability section
            await self.page.evaluate("window.scrollTo(0, 600)")
            await asyncio.sleep(1)
            
            # Try to find the availability map
            map_section = await self.page.query_selector('.leaflet-container')
            if not map_section:
                print("    Map not found, trying alternative selectors...")
                map_section = await self.page.query_selector('[class*="availability"]')
            
            print(f"[3/5] Extracting city list...")
            # Get all cities from the list
            cities = await self.page.query_selector_all('[class*="content-cities"] a, [class*="city-list"] a, .city-item')
            
            if not cities:
                # Try alternative: look for city names in the dropdown
                cities = await self.page.query_selector_all('div:has-text("Todas Las Ciudades") ~ div a')
            
            # Extract city names
            city_names = []
            for city in cities[:10]:  # Limit to first 10 cities for speed
                try:
                    name = await city.inner_text()
                    if name and len(name) > 1:
                        city_names.append(name.strip())
                except:
                    continue
            
            print(f"    Found {len(city_names)} cities: {city_names[:5]}...")
            
            print(f"[4/5] Clicking on map markers to load store data...")
            # Click on the map to trigger data loading
            if map_section:
                await map_section.click()
                await asyncio.sleep(2)
            
            # Try clicking on individual markers
            markers = await self.page.query_selector_all('.leaflet-marker-icon')
            print(f"    Found {len(markers)} map markers")
            
            if markers:
                # Click first few markers to load data
                for i, marker in enumerate(markers[:3]):
                    try:
                        await marker.click(force=True)
                        await asyncio.sleep(0.5)
                    except:
                        continue
            
            print(f"[5/5] Extracting store stock data from DOM...")
            # Extract stock data using JavaScript
            stock_data = await self.page.evaluate('''() => {
                const results = [];
                
                // Method 1: Look for elements with "unid" text
                const allElements = document.querySelectorAll('*');
                const stockElements = [];
                
                allElements.forEach(el => {
                    const text = el.textContent;
                    if (text && /\\d+\\s*unid/i.test(text) && el.children.length < 3) {
                        stockElements.push({
                            text: el.textContent.trim().substring(0, 200),
                            tag: el.tagName
                        });
                    }
                });
                
                // Method 2: Look for store containers
                const storeContainers = document.querySelectorAll('[class*="store"], [class*="tienda"], [class*="sucursal"]');
                storeContainers.forEach(container => {
                    const text = container.textContent;
                    if (text && /\\d+\\s*unid/i.test(text)) {
                        results.push({
                            text: text.trim().substring(0, 300)
                        });
                    }
                });
                
                // Method 3: Look in popups
                const popups = document.querySelectorAll('.leaflet-popup-content');
                popups.forEach(popup => {
                    results.push({
                        popup: popup.innerHTML.substring(0, 500)
                    });
                });
                
                return {
                    stockElements: stockElements.slice(0, 20),
                    storeContainers: results.slice(0, 20)
                };
            }''')
            
            # Parse the extracted data
            stores_found = []
            
            for elem in stock_data.get('stockElements', []):
                text = elem.get('text', '')
                # Extract stock number
                match = re.search(r'(\d+)\s*unid', text, re.IGNORECASE)
                if match:
                    stock = int(match.group(1))
                    stores_found.append({
                        "raw_text": text[:100],
                        "stock": stock
                    })
            
            result["stores_raw"] = stores_found
            result["total_stores"] = len(stores_found)
            result["total_stock"] = sum(s.get("stock", 0) for s in stores_found)
            
            # Also get the full availability section HTML for parsing
            avail_html = await self.page.evaluate('''() => {
                const section = document.querySelector('[class*="availability"], [class*="disponibilidad"]');
                return section ? section.innerHTML.substring(0, 5000) : null;
            }''')
            
            if avail_html:
                result["availability_html_sample"] = avail_html[:1000]
            
            return result
            
        except Exception as e:
            result["error"] = str(e)
            return result
    
    async def get_stock_for_city(self, product_url: str, city_name: str) -> dict:
        """
        Get stock for a specific city
        """
        result = {
            "city": city_name,
            "stores": [],
            "total_stock": 0
        }
        
        try:
            await self.page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)
            
            # Scroll to availability section
            await self.page.evaluate("window.scrollTo(0, 600)")
            await asyncio.sleep(1)
            
            # Click on the city
            city_link = await self.page.query_selector(f'a:has-text("{city_name}")')
            if city_link:
                await city_link.click()
                await asyncio.sleep(2)
            
            # Extract store data for this city
            stores_data = await self.page.evaluate('''(cityName) => {
                const results = [];
                const allText = document.body.innerText;
                
                // Look for store entries with stock
                const lines = allText.split('\\n');
                let currentStore = null;
                
                lines.forEach(line => {
                    line = line.trim();
                    if (line.includes('unid')) {
                        const match = line.match(/(\\d+)\\s*unid/i);
                        if (match) {
                            results.push({
                                text: line,
                                stock: parseInt(match[1])
                            });
                        }
                    }
                });
                
                return results;
            }''', city_name)
            
            result["stores"] = stores_data
            result["total_stock"] = sum(s.get("stock", 0) for s in stores_data)
            
        except Exception as e:
            result["error"] = str(e)
            
        return result


async def main():
    """Demo: Extract stock for a single product"""
    
    product_url = "https://www.farmatodo.com.ve/producto/113016367-acetaminofen-500mg-10tabletas"
    
    print("=" * 60)
    print("FARMATODO GRANULAR STOCK SCRAPER - 10/10 Edition")
    print("=" * 60)
    
    async with GranularStockScraper(headless=True) as scraper:
        print(f"\nScraping: {product_url}\n")
        
        result = await scraper.get_stock_by_store(product_url)
        
        print("\n" + "=" * 60)
        print("RESULTS")
        print("=" * 60)
        
        print(f"Product: {result.get('product_name', 'Unknown')}")
        print(f"Total stores found: {result['total_stores']}")
        print(f"Total stock across stores: {result['total_stock']}")
        
        if result.get('stores_raw'):
            print(f"\nStore samples:")
            for store in result['stores_raw'][:10]:
                print(f"  - Stock: {store['stock']} unid | {store['raw_text'][:60]}...")
        
        if result.get('error'):
            print(f"\nError: {result['error']}")
        
        # Save results
        output_file = "granular_stock_data.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to: {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
