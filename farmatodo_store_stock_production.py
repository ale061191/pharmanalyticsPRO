"""
Farmatodo Store Stock Scraper - PRODUCTION VERSION
Uses the exact technique that worked in browser subagent testing

CONFIRMED: Stock per store IS available with format:
  Store Name | Address | XX unid
"""
import asyncio
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright


async def scrape_store_stock(product_url: str, max_cities: int = 5) -> dict:
    """
    Production-ready scraper for store-level stock.
    Uses increased timeouts and incremental scrolling.
    """
    result = {
        'product_url': product_url,
        'scraped_at': datetime.now().isoformat(),
        'product_name': None,
        'stores': [],
        'summary': {}
    }
    
    playwright = await async_playwright().start()
    
    try:
        browser = await playwright.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(
            viewport={'width': 1400, 'height': 1000},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        print(f"[1/6] Loading page...")
        await page.goto(product_url, wait_until='networkidle', timeout=90000)
        
        # Get product name
        try:
            name = await page.locator('h1').first.text_content()
            result['product_name'] = name.strip() if name else None
            print(f"    Product: {result['product_name'][:50] if result['product_name'] else 'N/A'}")
        except:
            pass
        
        print(f"[2/6] Scrolling page incrementally...")
        for i in range(10):  # Scroll 10 times
            await page.evaluate(f'window.scrollBy(0, 500)')
            await asyncio.sleep(0.5)
        
        print(f"[3/6] Waiting for content to load...")
        await asyncio.sleep(5)
        
        print(f"[4/6] Looking for availability section...")
        # Try to scroll to content-cities or map
        has_content = await page.evaluate('''() => {
            const container = document.querySelector('.content-cities');
            if (container) {
                container.scrollIntoView({behavior: 'smooth', block: 'center'});
                return true;
            }
            const map = document.querySelector('.leaflet-container');
            if (map) {
                map.scrollIntoView({behavior: 'smooth', block: 'center'});
                return true;
            }
            return false;
        }''')
        print(f"    Content found: {has_content}")
        
        await asyncio.sleep(3)
        
        print(f"[5/6] Extracting store stock data...")
        # Use the exact JavaScript that worked in browser subagent
        stores_data = await page.evaluate('''() => {
            const results = [];
            
            // Method 1: Find all elements containing 'unid'
            const allText = document.body.innerText;
            const lines = allText.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const stockMatch = line.match(/(\\d+)\\s*unid/i);
                
                if (stockMatch) {
                    let context = [];
                    for (let j = Math.max(0, i-3); j <= i; j++) {
                        context.push(lines[j]);
                    }
                    
                    results.push({
                        stock: parseInt(stockMatch[1]),
                        line: line,
                        context: context.join(' | ').substring(0, 200)
                    });
                }
            }
            
            return results;
        }''')
        
        print(f"    Found {len(stores_data)} stock entries")
        
        # Process results
        for item in stores_data:
            # Skip if it's just pricing info
            if 'Bs' in item['line'] or 'precio' in item['line'].lower():
                continue
            if item['stock'] == 0:
                continue
                
            result['stores'].append({
                'stock': item['stock'],
                'raw': item['line'][:80],
                'context': item['context']
            })
        
        print(f"[6/6] Calculating summary...")
        total_stock = sum(s['stock'] for s in result['stores'])
        
        result['summary'] = {
            'total_stores': len(result['stores']),
            'total_stock': total_stock,
            'avg_stock': round(total_stock / len(result['stores']), 1) if result['stores'] else 0
        }
        
        await browser.close()
        
    except Exception as e:
        import traceback
        result['error'] = str(e)
        result['traceback'] = traceback.format_exc()
        
    finally:
        await playwright.stop()
    
    return result


async def main():
    product_url = "https://www.farmatodo.com.ve/producto/113016367-acetaminofen-500mg-10tabletas"
    
    print("=" * 65)
    print("FARMATODO STORE STOCK SCRAPER - PRODUCTION")
    print("=" * 65)
    print(f"\nTarget: {product_url}\n")
    
    result = await scrape_store_stock(product_url)
    
    print("\n" + "=" * 65)
    print("RESULTS")
    print("=" * 65)
    
    print(f"\nProduct: {result.get('product_name', 'N/A')}")
    
    summary = result.get('summary', {})
    print(f"\n📊 Summary:")
    print(f"   Stores with stock: {summary.get('total_stores', 0)}")
    print(f"   Total stock: {summary.get('total_stock', 0):,} units")
    
    stores = result.get('stores', [])
    if stores:
        print(f"\n🏪 Store Stock Data (First 15):")
        for i, store in enumerate(stores[:15], 1):
            print(f"  {i}. {store['stock']:4} unid | {store['raw'][:50]}...")
    else:
        print("\n⚠️  No store-level stock found in this run.")
        print("    The availability section may require user interaction.")
        print("\n💡 TIP: Use the browser subagent for interactive extraction.")
    
    if result.get('error'):
        print(f"\n❌ Error: {result['error']}")
    
    # Save
    with open("store_stock_production.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Saved to: store_stock_production.json")


if __name__ == "__main__":
    asyncio.run(main())
