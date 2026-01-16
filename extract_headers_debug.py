from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        print("🔍 Navigating (Debug View)...")
        
        captured = False
        
        def handle_request(request):
            if 'algolia' in request.url:
                print(f"\n📡 Call: {request.url}")
                print(f"   Method: {request.method}")
                print(f"   Headers: {json.dumps(request.headers, indent=2)}")
                try:
                    print(f"   Body: {request.post_data}")
                except:
                    pass
                
                nonlocal captured
                captured = True

        page.on("request", handle_request)
        
        try:
            # Go to home and search
            page.goto("https://www.farmatodo.com.ve/", timeout=60000)
            page.wait_for_timeout(5000)
            
            # Search
            page.click("input[type='search']", timeout=10000)
            page.fill("input[type='search']", "Atamel")
            page.press("input[type='search']", "Enter")
            
            page.wait_for_timeout(10000)
            
        except Exception as e:
            print(f"Error: {e}")
            
        browser.close()
        
        if captured:
            print("\n✅ Captured Algolia calls.")
        else:
            print("\n❌ No Algolia calls captured.")

if __name__ == "__main__":
    run()
