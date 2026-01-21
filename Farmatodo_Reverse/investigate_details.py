import asyncio
from playwright.async_api import async_playwright
import json

# Target URL (Venezuelan Product)
# Using one from the sitemap
TEST_URL = "https://www.farmatodo.com.ve/producto/111004145-depilacion-cera-mila-olla-100gr"

async def inspect_product():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        print(f"🕵️ Inspecting: {TEST_URL}")
        await page.goto(TEST_URL, wait_until="domcontentloaded")
        
        # 1. Get Full HTML
        content = await page.content()
        with open("product_dump.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ HTML Saved to product_dump.html")
        
        # 2. Extract specific visible details
        name = await page.inner_text("h1")
        price = await page.inner_text("span.box__price--current") if await page.query_selector("span.box__price--current") else "Not Found"
        
        print(f"Name: {name}")
        print(f"Price: {price}")
        
        # 3. Dump __NEXT_DATA__ or similar JSON states if they exist
        # Script tags often contain the full product model including hidden properties like ATC
        json_script = await page.query_selector("script#__NEXT_DATA__")
        if json_script:
            json_text = await json_script.inner_text()
            with open("product_state.json", "w", encoding="utf-8") as f:
                f.write(json_text)
            print("✅ __NEXT_DATA__ extracted to product_state.json (Contains hidden attributes?)")
        else:
            print("⚠️ No __NEXT_DATA__ found. Checking for other JSON-LD...")
            json_lds = await page.query_selector_all('script[type="application/ld+json"]')
            for i, script in enumerate(json_lds):
                text = await script.inner_text()
                with open(f"json_ld_{i}.json", "w", encoding="utf-8") as f:
                    f.write(text)
                print(f"   Saved JSON-LD {i}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_product())
