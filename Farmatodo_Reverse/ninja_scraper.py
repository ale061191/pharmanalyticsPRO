import asyncio
import random
import json
import csv
import os
import re
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# INPUT/OUTPUT
URLS_FILE = "extracted_data/product_urls.txt"
JSON_OUTPUT = "extracted_data/farmatodo_products_full.json"
CSV_OUTPUT = "extracted_data/farmatodo_products_full.csv"

# CONFIG
CONCURRENCY = 3  # Safe number of tabs
limit_products = 10 # Set to None for ALL products

async def block_resources(route):
    """Block unnecessary resources to speed up loading."""
    if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
        await route.abort()
    else:
        await route.continue_()

async def extract_product_data(page, url):
    """Extracts data from a single product page using selectors found in OSINT."""
    data = {
        "url": url,
        "name": None,
        "price": None,
        "invima": None,
        "status": "Unknown",
        "scraped_at": datetime.now().isoformat()
    }
    
    try:
        # Go to URL
        # Wait until network is idle or domcontentloaded to save time. 
        # domcontentloaded is faster but might miss JS rendered price.
        # Verified script uses 'inner_html' so it expects DOM.
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        
        # Wait for meaningful content (Title or Price)
        try:
            await page.wait_for_selector("h1", timeout=5000)
        except:
            pass # Continue anyway, maybe it's partially loaded

        # 1. NAME Extraction
        title_el = await page.query_selector("h1")
        if title_el:
            data["name"] = (await title_el.inner_text()).strip()

        # 2. PRICE Extraction
        # Strategy: Try multiple potential selectors based on OSINT & Standard patterns
        price_selectors = [
            "span.box__price--current", # From OSINT
            ".price", 
            ".product-price",
            "span[class*='price']"
        ]
        
        for selector in price_selectors:
            el = await page.query_selector(selector)
            if el:
                text = await el.inner_text()
                # Clean price (remove Bs. $ etc)
                clean_price = re.sub(r'[^\d,.]', '', text)
                data["price"] = clean_price
                break
        
        # 3. STOCK/STATUS
        # Check for specific text
        body_text = await page.content()
        if "Agotado" in body_text or "Sin inventario" in body_text:
            data["status"] = "Out of Stock"
        else:
            data["status"] = "Available"

        # 4. INVIMA Code
        # OSINT suggested looking near "Registro Invima"
        # We search raw text for the pattern
        invima_match = re.search(r'(Invima:|Registro Invima)\s*([A-Za-z0-9-]+)', body_text, re.IGNORECASE)
        if invima_match:
            data["invima"] = invima_match.group(2)

    except Exception as e:
        print(f"⚠️ Error parsing {url}: {e}")
        data["error"] = str(e)

    return data

async def worker(queue, results, browser):
    """Worker to process URLs from queue."""
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    # Enable blocking
    page = await context.new_page()
    await page.route("**/*", block_resources)

    while True:
        url = await queue.get()
        if url is None:
            break
        
        print(f"🕷️ Scraping: {url} ...")
        product_data = await extract_product_data(page, url)
        
        if product_data["name"]:
            print(f"   ✅ Found: {product_data['name']} - {product_data['price']}")
        else:
            print(f"   ❌ Failed to extract name for {url}")

        results.append(product_data)
        queue.task_done()
        
        # Random sleep to be nice
        await asyncio.sleep(random.uniform(0.5, 2.0))
    
    await context.close()

async def main():
    if not os.path.exists(URLS_FILE):
        print(f"❌ URLs file not found: {URLS_FILE}. Run sitemap_parser.py first.")
        return

    # Load URLs
    with open(URLS_FILE, "r") as f:
        urls = [line.strip() for line in f if line.strip()]
    
    print(f"Loaded {len(urls)} URLs.")
    
    if limit_products:
        urls = urls[:limit_products]
        print(f"⚠️ LIMITING TO FIRST {limit_products} URLs FOR TESTING.")

    queue = asyncio.Queue()
    for u in urls:
        queue.put_nowait(u)

    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # Create workers
        tasks = []
        for _ in range(CONCURRENCY):
            # Signal end of queue with None
            queue.put_nowait(None)
            task = asyncio.create_task(worker(queue, results, browser))
            tasks.append(task)
        
        await asyncio.gather(*tasks) # Wait for all workers handling None to finish? 
        # Actually queue.join() is better if we didn't use None pill, but None pill is standard for workers.
        # Wait for all tasks
        
        # Save Results
        with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=4, ensure_ascii=False)
            
        # CSV
        if results:
            keys = results[0].keys()
            with open(CSV_OUTPUT, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(results)
                
        print(f"\n🏁 Done. Saved {len(results)} products to {JSON_OUTPUT} and {CSV_OUTPUT}")

from datetime import datetime

if __name__ == "__main__":
    asyncio.run(main())
