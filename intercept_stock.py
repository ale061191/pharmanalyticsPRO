"""
Farmatodo Branch Stock Scraper v2
Uses Playwright to intercept API calls - saves responses incrementally
"""
import asyncio
import json
from playwright.async_api import async_playwright

PRODUCT_URL = "https://www.farmatodo.com.ve/producto/236450032-acetaminofen-ag-500mg"
OUTPUT_FILE = "captured_stock_responses.json"

captured_responses = []

def save_responses():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(captured_responses, f, indent=2, ensure_ascii=False)
    print(f"  [Saved {len(captured_responses)} responses to {OUTPUT_FILE}]")

async def intercept_stock_api():
    print(f"Opening product page: {PRODUCT_URL}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Run headless for speed
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        # Intercept all network responses
        async def handle_response(response):
            url = response.url
            # Look for API calls that might contain store/stock data
            keywords = ['stock', 'store', 'tienda', 'sucursal', 'disponibilidad', 'nearby', 'availability', 'api-transactional', 'api-search']
            if any(keyword in url.lower() for keyword in keywords):
                print(f"\n[CAPTURED] {response.status} - {url[:100]}...")
                try:
                    body = await response.json()
                    captured_responses.append({
                        'url': url,
                        'status': response.status,
                        'body': body
                    })
                    print(f"  Response keys: {list(body.keys()) if isinstance(body, dict) else f'array with {len(body)} items'}")
                    save_responses()  # Save after each capture
                except Exception as e:
                    print(f"  Could not parse JSON: {e}")
        
        page.on('response', handle_response)
        
        # Navigate to product page with longer timeout
        print("Navigating to product page...")
        try:
            await page.goto(PRODUCT_URL, wait_until='domcontentloaded', timeout=60000)
            print("Page loaded (DOM ready)")
        except Exception as e:
            print(f"Navigation warning: {e}")
        
        # Wait for dynamic content
        await asyncio.sleep(5)
        
        # Try scrolling to trigger lazy-loaded content
        print("Scrolling page to trigger lazy loading...")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2)
        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(2)
        
        # Look for the "Ver disponibilidad en tiendas" button
        print("Looking for 'Ver disponibilidad' button...")
        
        # Take a screenshot for debugging
        await page.screenshot(path='debug_product_page.png')
        print("Screenshot saved: debug_product_page.png")
        
        # Get all clickable elements with interesting text
        elements = await page.query_selector_all('a, button, [role=\"button\"], span[class*=\"click\"], div[class*=\"click\"]')
        interesting_elements = []
        for el in elements:
            try:
                text = await el.text_content()
                if text:
                    text = text.strip()[:80]
                    if any(kw in text.lower() for kw in ['disponibilidad', 'tienda', 'sucursal', 'ubicación', 'mapa', 'store']):
                        interesting_elements.append((el, text))
            except:
                pass
        
        print(f"Found {len(interesting_elements)} interesting clickable elements:")
        for el, text in interesting_elements[:5]:
            print(f"  - {text}")
        
        # Click the first matching element
        if interesting_elements:
            el, text = interesting_elements[0]
            print(f"\nClicking: {text}")
            try:
                await el.click()
                await asyncio.sleep(5)  # Wait for API call
                await page.screenshot(path='debug_after_click.png')
            except Exception as e:
                print(f"Click failed: {e}")
        
        # Final wait for any pending requests
        await asyncio.sleep(3)
        
        await browser.close()
    
    print(f"\n=== CAPTURED {len(captured_responses)} API RESPONSES ===")
    
    # Analyze for store data
    for resp in captured_responses:
        body = resp['body']
        url = resp['url']
        print(f"\n[{url[:60]}...]")
        if isinstance(body, dict):
            for k, v in body.items():
                if isinstance(v, list) and len(v) > 0:
                    print(f"  {k}: {len(v)} items")
                    if isinstance(v[0], dict):
                        print(f"    Sample keys: {list(v[0].keys())[:10]}")
                        if len(v) > 0:
                            print(f"    First item sample: {str(v[0])[:200]}")
    
    return captured_responses

if __name__ == "__main__":
    asyncio.run(intercept_stock_api())
