import asyncio
import json
from playwright.async_api import async_playwright

# Target URL (A known product page)
TARGET_URL = "https://www.farmatodo.com.ve/producto/11832049-atamel-forte-650-mg-tabletas-10-unidades"

async def intercept_network():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True) # Visible mode helpful for debugging, but headless is faster
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        page = await context.new_page()

        print(f"🕵️  Initializing Web Traffic Spy on: {TARGET_URL}")
        
        # Store captured API candidates
        api_candidates = []

        # Event listener for responses
        async def handle_response(response):
            try:
                url = response.url
                resource_type = response.request.resource_type
                
                # Filter for interesting traffic (APIs, JSON, XHR)
                if resource_type in ["fetch", "xhr"] or "json" in response.headers.get("content-type", ""):
                    
                    # Exclude common junk (tracking, analytics, images)
                    if any(x in url for x in ["google", "facebook", "braze", "sentry", ".png", ".jpg", ".css", ".js"]):
                        return

                    print(f"⚡ [INTERCEPTED] {resource_type.upper()}: {url}")
                    
                    try:
                        # Try to parse JSON body
                        body = await response.json()
                        
                        # Look for gold keywords in the response
                        body_str = json.dumps(body)
                        keywords = ["stock", "inventory", "atc", "code", "principio", "active", "stores", "sucursal"]
                        
                        found_keywords = [k for k in keywords if k in body_str.lower()]
                        
                        if found_keywords:
                            print(f"   🔥 MATCH FOUND! Keywords: {found_keywords}")
                            candidate = {
                                "url": url,
                                "method": response.request.method,
                                "headers": response.request.headers,
                                "response_preview": body  # Save full body
                            }
                            api_candidates.append(candidate)
                            
                    except Exception:
                        # Not JSON or empty
                        pass
                        
            except Exception as e:
                pass

        page.on("response", handle_response)

        try:
            await page.goto(TARGET_URL, timeout=60000)
            print("⏳ Page Loaded. Waiting for dynamic requests...")
            
            # Scroll down to trigger lazy loading
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(5)
            
            # Click potential 'Check Stock' buttons if they exist (Generic attempt)
            # await page.click("text=Consultar disponibilidad", timeout=2000) 
            
        except Exception as e:
            print(f"❌ Navigation or Interaction failed: {e}")

        filename = "web_api_intercept.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(api_candidates, f, indent=2)
            
        print(f"\n✅ Analysis Complete. Captured {len(api_candidates)} potential API responses.")
        print(f"📁 Saved to {filename}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(intercept_network())
