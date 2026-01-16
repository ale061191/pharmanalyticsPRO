from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        print("🔍 Navigating (Key Verification)...")
        
        target_index = "products_vzla"
        
        def handle_request(request):
            if target_index in request.url:
                print(f"\n🎯 TARGET HIT: {request.url}")
                print(f"   Headers: {json.dumps(request.headers, indent=2)}")
                try:
                    pd = request.post_data
                    print(f"   Body: {pd}")
                except:
                    pass
                
                # Check for key in query params too
                if 'x-algolia-api-key' in request.url:
                    print(f"   Key in URL: {request.url}")

        page.on("request", handle_request)
        
        try:
            page.goto("https://www.farmatodo.com.ve/buscar?texto=atamel", timeout=60000)
            page.wait_for_timeout(15000)
            
        except Exception as e:
            print(f"Error: {e}")
            
        browser.close()

if __name__ == "__main__":
    run()
