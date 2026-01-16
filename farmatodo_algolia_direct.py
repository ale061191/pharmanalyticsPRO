import requests
import json

# Credentials
APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"

# Headers with Origin/Referer to bypass restrictions
HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": API_KEY,
    "Content-Type": "application/json",
    "Referer": "https://www.farmatodo.com.ve/",
    "Origin": "https://www.farmatodo.com.ve",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def search_products(query="", index_name="products-vzla", hits_per_page=20):
    url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{index_name}/query"
    
    payload = {
        "params": f"query={query}&hitsPerPage={hits_per_page}"
    }
    
    print(f"📡 Querying Algolia: {index_name} for '{query}'...")
    
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Hits: {data.get('nbHits', 0)}")
            return data.get('hits', [])
        else:
            print(f"   ❌ Error {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None

def main():
    print("=== Farmatodo Algolia Direct Scraper (With Headers) ===")
    
    # Try multiple possible index names
    candidates = ["products-vzla", "products_vzla", "products-ve", "products", "prod_vzla"]
    
    found_products = False
    
    for idx in candidates:
        hits = search_products("Acetaminofen", index_name=idx)
        if hits:
            print(f"\n📦 Found Products in '{idx}':")
            for hit in hits[:3]:
                # Adjust key names based on actual response
                name = hit.get('description', '') or hit.get('name', 'Unknown')
                price = hit.get('price', 'N/A')
                stock = hit.get('stock', 'N/A')
                id_ = hit.get('objectID', 'N/A')
                print(f"   - {name} | Price: {price} | Stock: {stock} | ID: {id_}")
            
            # Save full dump
            with open(f'algolia_hits_{idx}.json', 'w', encoding='utf-8') as f:
                json.dump(hits, f, ensure_ascii=False, indent=2)
                
            found_products = True
            break
            
    if not found_products:
        print("\n❌ Could not find any products in guessed indices.")

if __name__ == "__main__":
    main()
