from playwright.sync_api import sync_playwright
import json

def run():
    print("🕵️ Probing Stock Endpoint...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        captured = False
        
        def handle_request(request):
            if "farmatodo" in request.url:
                print(f"👉 Req: {request.method} {request.url}")

        def handle_response(response):
             if "nearby" in response.url or "stock" in response.url or "inventory" in response.url:
                print(f"\n📥 Resp: {response.url} ({response.status})")
                try:
                    data = response.json()
                    # Save full response to file
                    with open('stock_response.json', 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                    print(f"   ✅ Saved response to stock_response.json from {response.url}")
                except:
                    pass

        page.on("request", handle_request)
        page.on("response", handle_response)
        
        try:
            # Go to product page (Acetaminofen)
            url = "https://www.farmatodo.com.ve/producto/23645003297"
            print(f"   Navigating to {url}...")
            page.goto(url, timeout=60000)
            page.wait_for_timeout(5000)
            
            # Try to force the modal
            print("   Clicking availability button...")
            try:
                # Selector for "Ver disponibilidad" might be:
                page.click("p:has-text('Ver disponibilidad en tiendas')", timeout=5000)
            except:
                print("   Using fallback selector...")
                # Generic fallback logic
                page.evaluate("() => { const els = Array.from(document.querySelectorAll('p, span, div')); const el = els.find(e => e.innerText && e.innerText.includes('Ver disponibilidad')); if(el) el.click(); }")
                
            page.wait_for_timeout(10000)
            page.screenshot(path="debug_stock_probe.png")
            
        except Exception as e:
            print(f"Error: {e}")
            
        browser.close()

if __name__ == "__main__":
    run()
