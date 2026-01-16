from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        print("🔍 Navigating to Farmatodo to extract Algolia keys...")
        
        api_keys = {}
        
        def handle_request(request):
            # Check for Algolia headers in any request
            headers = request.headers
            if 'x-algolia-api-key' in headers:
                print(f"\n🔑 FOUND KEY: {headers['x-algolia-api-key']}")
                api_keys['api_key'] = headers['x-algolia-api-key']
            if 'x-algolia-application-id' in headers:
                print(f"🆔 FOUND APP ID: {headers['x-algolia-application-id']}")
                api_keys['app_id'] = headers['x-algolia-application-id']
                
            # Also check URL query params just in case
            if 'x-algolia-api-key' in request.url:
                print("Found key in URL!")

        page.on("request", handle_request)
        
        try:
            page.goto("https://www.farmatodo.com.ve/", timeout=60000)
            page.wait_for_timeout(5000)
            
            # Click search to trigger Algolia
            print("Clicking search bar...")
            page.click("input[type='search']", timeout=5000)
            page.fill("input[type='search']", "Atamel")
            page.press("input[type='search']", "Enter")
            
            page.wait_for_timeout(5000)
            
        except Exception as e:
            print(f"Error during navigation: {e}")
            
        browser.close()
        
        if api_keys:
            print("\n✅ Extraction Successful!")
            with open('algolia_keys.json', 'w') as f:
                json.dump(api_keys, f, indent=2)
        else:
            print("\n❌ Could not find Algolia keys.")

if __name__ == "__main__":
    run()
