import requests
import json

APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"
PRODUCT_ID = "23645003297"

INDICES = [
    "products-venezuela", # Seen in logs (failed)
    "products_ve",
    "products",
    "items_seo_vzla", # Seen in logs (failed)
    "properties-vzla",
    "pharmacy_products",
    "grocery_products"
]

HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": API_KEY,
    "Content-Type": "application/json"
}

def probe():
    print(f"Probing Algolia for Product ID: {PRODUCT_ID}")
    
    found_any = False
    
    for index in INDICES:
        print(f"Testing Index: {index}...", end=" ")
        
        # 1. Try retrieving object directly
        url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{index}/{PRODUCT_ID}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=5)
            if r.status_code == 200:
                print("SUCCESS (Direct GET)!")
                data = r.json()
                print(f"--- MATCH FOUND in index: '{index}' ---")
                
                # Check for stock/store related keys
                print("Keys containing 'store' or 'stock':")
                for k, v in data.items():
                    if "store" in k.lower() or "stock" in k.lower() or "sucursal" in k.lower() or "tienda" in k.lower():
                        print(f"  {k}: {v}")
                
                # Check if there is a 'stores' list
                if "stores" in data:
                    print(f"  'stores' field found! Type: {type(data['stores'])}")
                
                found_any = True
                break
            else:
                print(f"Failed ({r.status_code})")

        except Exception as e:
            print(f"Error: {e}")

        # 2. Try Searching
        if not found_any:
            search_url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{index}/query"
            payload = {"params": f"query={PRODUCT_ID}"}
            try:
                r_search = requests.post(search_url, headers=HEADERS, json=payload, timeout=5)
                if r_search.status_code == 200:
                    hits = r_search.json().get("hits", [])
                    if hits:
                        print(f"SUCCESS (Search)! Found {len(hits)} hits.")
                        print(f"--- MATCH FOUND in index: '{index}' ---")
                        data = hits[0]
                         # Check for stock/store related keys
                        print("Keys containing 'store' or 'stock':")
                        for k, v in data.items():
                            if "store" in k.lower() or "stock" in k.lower() or "sucursal" in k.lower() or "tienda" in k.lower():
                                print(f"  {k}: {v}")
                        found_any = True
                        break
            except Exception as e:
                pass
        
        print("") # Newline

    if not found_any:
        print("\n[!] No data found in any probed index.")

if __name__ == "__main__":
    probe()
