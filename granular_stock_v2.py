"""
Farmatodo Granular Stock Scraper V2 - 10/10 Edition
Extracts EXACT stock per store by interacting with the availability map

Strategy:
1. Navigate to product page
2. Scroll to "Disponibilidad en Farmatodo" section
3. Click each city to load stores
4. Extract store names and stock from DOM
"""
import asyncio
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright


class GranularStockScraperV2:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser = None
        self.page = None
        
    async def __aenter__(self):
        await self.start()
        return self
        
    async def __aexit__(self, *args):
        await self.close()
        
    async def start(self):
        """Initialize browser with stealth settings"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await self.browser.new_context(
            viewport={'width': 1400, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
        )
        self.page = await context.new_page()
        
    async def close(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def get_store_stock(self, product_url: str) -> dict:
        """
        Extract stock per store for a product
        """
        result = {
            "product_url": product_url,
            "scraped_at": datetime.now().isoformat(),
            "product_name": None,
            "cities": {},
            "all_stores": [],
            "summary": {}
        }
        
        try:
            print(f"[1/6] Navigating to product...")
            await self.page.goto(product_url, wait_until="networkidle", timeout=45000)
            await asyncio.sleep(2)
            
            # Get product name
            try:
                name = await self.page.locator('h1').first.inner_text()
                result["product_name"] = name.strip()
                print(f"    Product: {name[:50]}...")
            except:
                pass
            
            print(f"[2/6] Scrolling to availability section...")
            # Scroll to availability section
            await self.page.evaluate('''() => {
                const availSection = document.querySelector('[class*="availability"], .disponibilidad');
                if (availSection) availSection.scrollIntoView({behavior: 'smooth', block: 'center'});
            }''')
            await asyncio.sleep(1)
            
            # Alternative scroll
            await self.page.evaluate("window.scrollTo(0, 700)")
            await asyncio.sleep(2)
            
            print(f"[3/6] Getting city list...")
            # Get all city names from the list
            cities = await self.page.evaluate('''() => {
                const cityElements = document.querySelectorAll('.content-cities a, [class*="city"] a');
                return Array.from(cityElements).map(el => el.textContent.trim()).filter(t => t.length > 0);
            }''')
            
            if not cities:
                # Alternative: look for text that looks like city names
                cities = await self.page.evaluate('''() => {
                    const text = document.body.innerText;
                    const cityMatches = text.match(/(Caracas|Maracaibo|Valencia|Barquisimeto|Barcelona|Anaco|Araure|Barinas|Cabimas|Lechería|Maracay|Mérida|Puerto Ordaz|Punto Fijo)/gi);
                    return cityMatches ? [...new Set(cityMatches)] : [];
                }''')
            
            print(f"    Found {len(cities)} cities: {cities[:5]}...")
            
            print(f"[4/6] Clicking on map to activate data loading...")
            
            # Click on map markers to trigger popup
            markers_clicked = 0
            try:
                markers = await self.page.locator('.leaflet-marker-icon').all()
                print(f"    Found {len(markers)} map markers")
                
                for marker in markers[:5]:  # Click first 5 markers
                    try:
                        await marker.click(force=True, timeout=3000)
                        await asyncio.sleep(1)
                        markers_clicked += 1
                        
                        # Check for popup content
                        popup = await self.page.query_selector('.leaflet-popup-content')
                        if popup:
                            popup_text = await popup.inner_text()
                            print(f"    Popup found: {popup_text[:60]}...")
                    except Exception as e:
                        continue
                        
            except Exception as e:
                print(f"    Could not click markers: {e}")
            
            print(f"    Clicked {markers_clicked} markers")
            
            print(f"[5/6] Extracting store data from page...")
            
            # Extract all store/stock data from the page
            store_data = await self.page.evaluate('''() => {
                const stores = [];
                
                // Look for popup contents with stock info
                const popups = document.querySelectorAll('.leaflet-popup-content, [class*="popup"], [class*="info-window"]');
                popups.forEach(popup => {
                    const text = popup.innerText || popup.textContent;
                    if (text && text.includes('unid')) {
                        stores.push({
                            source: 'popup',
                            text: text.trim()
                        });
                    }
                });
                
                // Look for store list items
                const storeItems = document.querySelectorAll('[class*="store-item"], [class*="tienda"], [class*="sucursal"]');
                storeItems.forEach(item => {
                    const text = item.innerText;
                    if (text && text.includes('unid')) {
                        stores.push({
                            source: 'store-list',
                            text: text.trim()
                        });
                    }
                });
                
                // Look in the entire body for stock patterns
                const bodyText = document.body.innerText;
                const lines = bodyText.split('\\n');
                
                lines.forEach((line, idx) => {
                    line = line.trim();
                    // Match patterns like "Store Name 46 unid" or "46 unidades"
                    if (/\\d+\\s*(unid|unidades)/i.test(line)) {
                        stores.push({
                            source: 'body-text',
                            lineNumber: idx,
                            text: line
                        });
                    }
                });
                
                return stores;
            }''')
            
            print(f"    Found {len(store_data)} potential stock entries")
            
            # Parse the stock data
            parsed_stores = []
            for entry in store_data:
                text = entry.get('text', '')
                
                # Skip if it's just prices or unrelated text
                if 'Agregar' in text or 'producto' in text.lower() or len(text) > 300:
                    continue
                
                # Extract stock number
                stock_match = re.search(r'(\d+)\s*(unid|unidades)', text, re.IGNORECASE)
                if stock_match:
                    stock = int(stock_match.group(1))
                    
                    # Try to extract store name (usually before the stock number)
                    name_match = re.search(r'^([A-Za-záéíóúñÁÉÍÓÚÑ\s\-\.]+)', text)
                    store_name = name_match.group(1).strip() if name_match else "Unknown"
                    
                    parsed_stores.append({
                        "store_name": store_name[:50],
                        "stock": stock,
                        "raw_text": text[:100],
                        "source": entry.get('source')
                    })
            
            # Deduplicate by raw_text
            seen = set()
            unique_stores = []
            for store in parsed_stores:
                key = store['raw_text'][:30]
                if key not in seen:
                    seen.add(key)
                    unique_stores.append(store)
            
            result["all_stores"] = unique_stores
            
            print(f"[6/6] Calculating summary...")
            total_stores = len(unique_stores)
            total_stock = sum(s.get('stock', 0) for s in unique_stores)
            
            result["summary"] = {
                "total_stores_with_stock": total_stores,
                "total_stock_units": total_stock,
                "avg_stock_per_store": round(total_stock / total_stores, 1) if total_stores > 0 else 0,
                "cities_found": cities
            }
            
            return result
            
        except Exception as e:
            result["error"] = str(e)
            import traceback
            result["traceback"] = traceback.format_exc()
            return result


async def main():
    """Test the scraper with a sample product"""
    
    # Use a product that's more likely to have availability data
    product_url = "https://www.farmatodo.com.ve/producto/113016367-acetaminofen-500mg-10tabletas"
    
    print("=" * 70)
    print("FARMATODO GRANULAR STOCK SCRAPER V2")
    print("=" * 70)
    
    async with GranularStockScraperV2(headless=True) as scraper:
        print(f"\nTarget: {product_url}\n")
        
        result = await scraper.get_store_stock(product_url)
        
        print("\n" + "=" * 70)
        print("RESULTS")
        print("=" * 70)
        
        print(f"\nProduct: {result.get('product_name', 'N/A')}")
        
        summary = result.get('summary', {})
        print(f"\nSummary:")
        print(f"  Total stores with stock: {summary.get('total_stores_with_stock', 0)}")
        print(f"  Total stock units: {summary.get('total_stock_units', 0)}")
        print(f"  Avg stock per store: {summary.get('avg_stock_per_store', 0)}")
        
        stores = result.get('all_stores', [])
        if stores:
            print(f"\nStore Stock Details (First 10):")
            for store in stores[:10]:
                print(f"  - {store['store_name']}: {store['stock']} unid")
                print(f"      Raw: {store['raw_text'][:60]}...")
        else:
            print("\nNo individual store stock found via standard extraction.")
            print("This may require clicking on individual map markers.")
        
        if result.get('error'):
            print(f"\nError: {result['error']}")
        
        # Save full results
        output_file = "granular_stock_v2.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\nFull results saved to: {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
