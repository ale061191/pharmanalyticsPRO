from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        print("🔍 Navigating to Search Page to capture headers (Retry)...")
        
        captured_headers = None
        
        def handle_request(request):
            # Capture any Algolia search query
            if 'algolia' in request.url and 'query' in request.url:
                print(f"📡 Intercepted Call: {request.url[:50]}...")
                headers = request.headers
                if 'x-algolia-api-key' in headers:
                    print("✅ Captured Request Headers!")
                    nonlocal captured_headers
                    captured_headers = headers
                    
        page.on("request", handle_request)
        
        try:
            # Direct navigation to a search result page to trigger API
            page.goto("https://www.farmatodo.com.ve/buscar?texto=atamel", timeout=60000)
            
            # Wait for network idle or specific time
            page.wait_for_timeout(10000)
            
        except Exception as e:
            print(f"Error: {e}")
            
        browser.close()
        
        if captured_headers:
            with open('algolia_full_headers.json', 'w', encoding='utf-8') as f:
                json.dump(captured_headers, f, indent=2)
            print("Headers saved to algolia_full_headers.json")
        else:
            print("❌ No Algolia headers captured.")

if __name__ == "__main__":
    run()
