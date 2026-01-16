
import asyncio
from playwright.async_api import async_playwright
import json
import os

async def capture_har():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        # Create a new context with HAR recording enabled
        context = await browser.new_context(
            record_har_path="farmatodo_stock.har",
            record_har_mode="full"
        )
        
        page = await context.new_page()
        
        
        # Navigate directly to a specific product page (Acetaminofen)
        product_url = "https://www.farmatodo.com.ve/producto/23645003297"
        print(f"Navigating to {product_url}...")
        await page.goto(product_url, timeout=60000)
        
        # Wait for "Ver disponibilidad en tiendas" button
        print("Waiting for availability button...")
        try:
            # Try specific selector first, then text
            # The button usually has text "Ver disponibilidad en tiendas"
            # It might be in a shadow DOM or iframe, but usually top level.
            await page.wait_for_timeout(5000) # Wait for page to settle
            
            # Look for button by text
            button = page.get_by_text("Ver disponibilidad en tiendas")
            if await button.count() > 0:
                print("Button found by text. Clicking...")
                await button.first.click()
            else:
                print("Button not found by text 'Ver disponibilidad en tiendas'. Trying variations...")
                # Try "Consultar disponibilidad"
                button = page.get_by_text("Consultar disponibilidad")
                if await button.count() > 0:
                    await button.first.click()
                else:
                    # Capture screenshot for debugging
                    print("Button not labeled as expected. Capturing screenshot...")
                    await page.screenshot(path="debug_probe_failure.png")
                    raise Exception("Availability button not found")
                    
        except Exception as e:
            print(f"Error finding/clicking button: {e}")
            await page.screenshot(path="debug_probe_error.png")
            
        print("Waiting for modal/map to load and requests to fire...")
        await page.wait_for_timeout(15000) # Give it generous time
        
        print("Closing browser...")
        await context.close()
        await browser.close()
        print("HAR file captured: farmatodo_stock.har")

if __name__ == "__main__":
    asyncio.run(capture_har())
