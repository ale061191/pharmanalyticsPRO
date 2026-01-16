#!/usr/bin/env python3
"""
Farmatodo API Traffic Capture
==============================
Simple script to capture API endpoints from network traffic
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("farmatodo_output")
OUTPUT_DIR.mkdir(exist_ok=True)

api_calls = []

async def intercept_response(response):
    """Intercept and log API responses"""
    url = response.url
    
    if any(x in url for x in ['api', 'gw-backend', 'algolia', 'transactional']):
        try:
            content_type = response.headers.get('content-type', '')
            entry = {
                "url": url,
                "status": response.status,
                "content_type": content_type
            }
            
            if 'json' in content_type and response.status == 200:
                try:
                    body = await response.json()
                    entry["data"] = body
                    entry["has_data"] = True
                except:
                    entry["has_data"] = False
            
            api_calls.append(entry)
            print(f"📡 [{response.status}] {url[:100]}...")
        except Exception as e:
            print(f"   Error: {e}")

async def main():
    print("=" * 60)
    print("🔍 FARMATODO API TRAFFIC CAPTURE")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800}
        )
        
        page = await context.new_page()
        page.on("response", intercept_response)
        
        print("\n🌐 Opening Farmatodo...")
        try:
            await page.goto("https://www.farmatodo.com.ve/", timeout=30000)
        except:
            print("Initial load timeout - continuing...")
        
        await asyncio.sleep(10)
        
        # Try to interact with the page
        print("\n🔎 Searching for products...")
        try:
            search_box = page.locator('input[type="search"], input[placeholder*="Buscar"]').first
            await search_box.fill("acetaminofen")
            await page.keyboard.press("Enter")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Search failed: {e}")
        
        print("\n⏳ Waiting 15 seconds to capture more traffic...")
        await asyncio.sleep(15)
        
        await browser.close()
    
    # Save captured API calls
    output_file = OUTPUT_DIR / "api_traffic.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_calls": len(api_calls),
            "calls": api_calls
        }, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"✅ Captured {len(api_calls)} API calls")
    print(f"📄 Saved to: {output_file}")
    print("=" * 60)
    
    # Print summary of unique endpoints
    endpoints = set(c["url"].split("?")[0] for c in api_calls)
    print("\n📋 Unique Endpoints Found:")
    for ep in sorted(endpoints):
        print(f"   • {ep}")

if __name__ == "__main__":
    asyncio.run(main())
