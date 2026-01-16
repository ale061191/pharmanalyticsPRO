#!/usr/bin/env python3
"""
Farmatodo Hybrid Scraper
========================
Uses Playwright to navigate and intercept API calls, then extracts data directly.
"""

import asyncio
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("farmatodo_output")
OUTPUT_DIR.mkdir(exist_ok=True)

class FarmatodoHybridScraper:
    """Hybrid scraper that intercepts API calls from the browser"""
    
    def __init__(self):
        self.api_calls = []
        self.products = []
        self.categories = []
        
    async def intercept_response(self, response):
        """Intercept and log API responses"""
        url = response.url
        
        # Capture interesting API calls
        if any(x in url for x in ['api-search', 'api-transactional', 'gw-backend', 'algolia']):
            try:
                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    body = await response.json()
                    self.api_calls.append({
                        "url": url,
                        "status": response.status,
                        "data": body
                    })
                    print(f"📡 Captured: {url[:80]}...")
            except:
                pass
    
    async def scrape_category(self, page, category_url: str, category_name: str):
        """Scrape all products from a category page"""
        print(f"\n📁 Scraping: {category_name}")
        
        await page.goto(category_url, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)
        
        # Scroll to load all products
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, 1000)")
            await asyncio.sleep(1)
        
        # Extract products from DOM
        products = await page.evaluate("""
            () => {
                const items = [];
                document.querySelectorAll('[class*="product"], [class*="card"]').forEach(el => {
                    const name = el.querySelector('[class*="name"], [class*="title"], h2, h3')?.innerText;
                    const price = el.querySelector('[class*="price"]')?.innerText;
                    const img = el.querySelector('img')?.src;
                    const link = el.querySelector('a')?.href;
                    
                    if (name && price) {
                        items.push({ name, price, image: img, url: link });
                    }
                });
                return items;
            }
        """)
        
        print(f"   Found {len(products)} products")
        return products
    
    async def run(self):
        """Main scraping routine"""
        print("=" * 60)
        print("🚀 FARMATODO HYBRID SCRAPER")
        print("=" * 60)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            
            page = await context.new_page()
            page.on("response", self.intercept_response)
            
            # Navigate to main page
            print("\n🌐 Navigating to Farmatodo...")
            await page.goto("https://www.farmatodo.com.ve/", wait_until="networkidle", timeout=60000)
            await asyncio.sleep(5)
            
            # Categories to scrape
            categories = [
                ("https://www.farmatodo.com.ve/salud-y-medicamentos", "Salud y Medicamentos"),
                ("https://www.farmatodo.com.ve/cuidado-personal", "Cuidado Personal"),
                ("https://www.farmatodo.com.ve/bebes-y-ninos", "Bebés y Niños"),
            ]
            
            all_products = []
            for url, name in categories:
                try:
                    products = await self.scrape_category(page, url, name)
                    for p in products:
                        p["category"] = name
                    all_products.extend(products)
                except Exception as e:
                    print(f"   ❌ Error: {e}")
            
            await browser.close()
        
        # Save results
        results = {
            "timestamp": datetime.now().isoformat(),
            "products": all_products,
            "api_calls": self.api_calls,
            "stats": {
                "total_products": len(all_products),
                "api_calls_captured": len(self.api_calls)
            }
        }
        
        output_file = OUTPUT_DIR / "precios_farmatodo.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        # Save API calls separately for analysis
        api_file = OUTPUT_DIR / "api_calls.json"
        with open(api_file, 'w', encoding='utf-8') as f:
            json.dump(self.api_calls, f, ensure_ascii=False, indent=2)
        
        print("\n" + "=" * 60)
        print("✅ SCRAPE COMPLETE!")
        print(f"   📦 Products: {len(all_products)}")
        print(f"   📡 API Calls Captured: {len(self.api_calls)}")
        print(f"   📄 Output: {output_file}")
        print("=" * 60)
        
        return results


async def main():
    scraper = FarmatodoHybridScraper()
    await scraper.run()


if __name__ == "__main__":
    asyncio.run(main())
