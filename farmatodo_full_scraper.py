import requests
import json
import time
from playwright.sync_api import sync_playwright

class FarmatodoScraper:
    def __init__(self, use_browser=True):
        self.use_browser = use_browser
        self.products = []
        
        # known credentials
        self.app_id = "VCOJEYD2PO"
        self.api_key = "869a91e98550dd668b8b1dc04bca9011"
        self.index_name = "products"
        
    def clean_product(self, hit):
        # DEBUG: Print all keys for the first product to verify hidden data
        if not hasattr(self, '_debug_printed'):
            print(f"\n🔍 RAW KEYS for {hit.get('objectID')}: {list(hit.keys())}")
            self._debug_printed = True
            
        return {
            'id': hit.get('objectID') or hit.get('id'),
            'name': hit.get('description') or hit.get('name'),
            'price': hit.get('offerPrice') or hit.get('fullPrice'),
            'stock': hit.get('stock'),
            'image': hit.get('mediaImageUrl'),
            'brand': hit.get('brand'),
            'category': hit.get('categorie')
        }

    def scrape_direct(self, query):
        print(f"📡 Attempting Direct API for '{query}'...")
        headers = {
            "X-Algolia-Application-Id": self.app_id,
            "X-Algolia-API-Key": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded", # Try form
            "Referer": "https://www.farmatodo.com.ve/",
            "Origin": "https://www.farmatodo.com.ve",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
             "x-algolia-agent": "Algolia for JavaScript (4.5.1); Browser"
        }
        url = f"https://{self.app_id}-dsn.algolia.net/1/indexes/{self.index_name}/query"
        
        # Try both payload formats
        payloads = [
            json.dumps({"params": f"query={query}&hitsPerPage=50"}),
            {"params": f"query={query}&hitsPerPage=50"}
        ]
        
        for payload in payloads:
            try:
                res = requests.post(url, headers=headers, data=payload, timeout=10)
                if res.status_code == 200:
                    hits = res.json().get('hits', [])
                    print(f"   ✅ Direct API Success! {len(hits)} hits.")
                    return [self.clean_product(h) for h in hits]
                else:
                    print(f"   ⚠️ Direct API Status: {res.status_code}")
            except Exception as e:
                print(f"   ⚠️ Direct API Error: {e}")
                
        return None

    def scrape_browser(self, query):
        print(f"🌐 Falling back to Browser Scraper for '{query}'...")
        intercepted_hits = []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False) # Headful for reliability
            page = browser.new_page()
            
            def handle_response(response):
                # Intercept both standard Algolia and custom proxy
                if "algolia" in response.url or "api-search" in response.url:
                    if response.status == 200:
                        try:
                            ctype = response.headers.get('content-type', '')
                            if 'json' in ctype:
                                data = response.json()
                                hits = data.get('hits', [])
                                if not hits and 'results' in data:
                                    for r in data['results']:
                                        hits.extend(r.get('hits', []))
                                
                                if hits:
                                    print(f"   📦 Intercepted {len(hits)} hits from {response.url[:40]}...")
                                    intercepted_hits.extend(hits)
                        except Exception as e:
                            pass # ignore parse errors on non-json

            page.on("response", handle_response)
            
            try:
                url = f"https://www.farmatodo.com.ve/buscar?texto={query}"
                print(f"   Navigating to {url}...")
                page.goto(url, timeout=60000)
                
                # Wait for content
                try:
                    page.wait_for_selector("app-product-card", timeout=15000)
                except:
                    print("   ⚠️ Timed out waiting for card, checking intercepted hits...")
                
                page.wait_for_timeout(3000)
                
            except Exception as e:
                print(f"   ❌ Browser Error: {e}")
            
            browser.close()
            
        unique_hits = {h.get('objectID', h.get('id')): h for h in intercepted_hits}.values()
        return [self.clean_product(h) for h in unique_hits]

    def search(self, query):
        # 1. Try Direct
        results = self.scrape_direct(query)
        if results:
            return results
        
        # 2. Try Browser
        if self.use_browser:
            return self.scrape_browser(query)
            
        return []

def main():
    print("=== Farmatodo Full Scraper ===")
    scraper = FarmatodoScraper()
    
    query = "Acetaminofen"
    products = scraper.search(query)
    
    if products:
        print(f"\n✅ Found {len(products)} products for '{query}':")
        for p in products[:5]:
             print(f"   - {p['name']} | Stock: {p['stock']} | Price: {p['price']}")
             
        with open('farmatodo_final_data.json', 'w', encoding='utf-8') as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
    else:
        print("\n❌ Failed to scrape products.")

if __name__ == "__main__":
    main()
