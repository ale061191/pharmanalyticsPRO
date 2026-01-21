"""
Farmatodo API Search Probe - Direct calls to their custom API endpoint
Based on traffic analysis of web_api_intercept.json
"""
import requests
import json

# Credentials and URLs extracted from web traffic
FARMATODO_API_SEARCH = "https://api-search.farmatodo.com"
ALGOLIA_APP_ID = "VCOJEYD2PO"
ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011"

# Common headers from captured traffic
BASE_HEADERS = {
    "x-algolia-api-key": ALGOLIA_API_KEY,
    "x-algolia-application-id": ALGOLIA_APP_ID,
    "referer": "https://www.farmatodo.com.ve/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "content-type": "application/x-www-form-urlencoded",
}

# Possible product indices to try
PRODUCT_INDICES = [
    "products-vzla",
    "products-ve", 
    "productos-vzla",
    "catalog-vzla",
    "catalogue-vzla",
    "farmatodo-products-vzla",
    "inventory-vzla",
]

def get_object_from_index(index_name, object_id):
    """Fetch a specific object by ID from an index"""
    url = f"{FARMATODO_API_SEARCH}/1/indexes/{index_name}/{object_id}"
    params = {"x-algolia-agent": "Algolia for JavaScript (4.5.1); Browser"}
    response = requests.get(url, headers=BASE_HEADERS, params=params, timeout=10)
    return response.status_code, response.text[:500]

def search_index(index_name, query="", hits=3):
    """Search an index"""
    url = f"{FARMATODO_API_SEARCH}/1/indexes/{index_name}/query"
    payload = {"query": query, "hitsPerPage": hits}
    
    headers = BASE_HEADERS.copy()
    headers["content-type"] = "application/json"
    
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    try:
        return response.status_code, response.json()
    except:
        return response.status_code, {"raw": response.text[:300]}

def list_indices():
    """Try to list all indices"""
    url = f"{FARMATODO_API_SEARCH}/1/indexes"
    response = requests.get(url, headers=BASE_HEADERS, timeout=10)
    try:
        return response.status_code, response.json()
    except:
        return response.status_code, {"raw": response.text[:500]}

def main():
    print("=" * 60)
    print("🔍 FARMATODO API-SEARCH DIRECT PROBE")
    print("=" * 60)
    print(f"Target: {FARMATODO_API_SEARCH}")
    print(f"App ID: {ALGOLIA_APP_ID}")
    print()
    
    # Step 1: Test connectivity with known working endpoint
    print("\n📋 STEP 1: Testing connectivity with known property...")
    status, result = get_object_from_index("properties-vzla", "WEB.HEADER.CONFIG")
    if status == 200:
        print(f"   ✅ Connection OK! Got WEB.HEADER.CONFIG")
    else:
        print(f"   ❌ Failed: Status {status}")
        print(f"   Response: {result}")
        return
    
    # Step 2: Try to list indices
    print("\n📋 STEP 2: Attempting to list all indices...")
    status, result = list_indices()
    if status == 200 and isinstance(result, dict) and "items" in result:
        print(f"   ✅ Found {len(result['items'])} indices!")
        for idx in result['items'][:20]:  # Show first 20
            print(f"      - {idx.get('name', 'unknown')}: {idx.get('entries', '?')} entries")
        
        # Save full index list
        with open("farmatodo_indices.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print("   💾 Saved full list to farmatodo_indices.json")
        
        # Look for product indices
        product_indices = [idx['name'] for idx in result['items'] 
                         if 'product' in idx['name'].lower() or 
                            'catalog' in idx['name'].lower() or
                            'item' in idx['name'].lower()]
        if product_indices:
            print(f"\n   🎯 PRODUCT INDICES FOUND: {product_indices}")
    else:
        print(f"   ⚠️ Could not list indices: Status {status}")
        print(f"   Using predefined list to probe...")
    
    # Step 3: Probe each potential product index
    print("\n📋 STEP 3: Probing for product indices...")
    found_products = False
    
    for index in PRODUCT_INDICES:
        print(f"\n🎯 Trying: {index}")
        status, result = search_index(index, "", 2)
        
        if status == 200 and isinstance(result, dict) and "hits" in result:
            if len(result['hits']) > 0:
                print(f"   ✅ SUCCESS! Got {result.get('nbHits', '?')} hits")
                found_products = True
                
                # Analyze first hit
                hit = result['hits'][0]
                print(f"   📊 First hit keys: {list(hit.keys())[:15]}")
                
                # Check for stock fields
                stock_keys = [k for k in hit.keys() if 'stock' in k.lower() or 'inventory' in k.lower()]
                if stock_keys:
                    print(f"   🔥 STOCK FIELDS: {stock_keys}")
                
                # Save sample
                output_file = f"farmatodo_{index}_sample.json"
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print(f"   💾 Saved to {output_file}")
            else:
                print(f"   ⚠️ Index exists but empty")
        elif status == 404:
            print(f"   ❌ Index not found")
        else:
            print(f"   ❌ Error {status}")
    
    # Step 4: Try to find stock-related configs in properties-vzla
    print("\n📋 STEP 4: Looking for stock config in properties-vzla...")
    stock_objects = [
        "STOCK.CONFIG", "STORE.STOCK.CONFIG", "INVENTORY.CONFIG",
        "PRODUCT.STOCK.CONFIG", "NEAREST.STORE.CONFIG"
    ]
    
    for obj_id in stock_objects:
        status, result = get_object_from_index("properties-vzla", obj_id)
        if status == 200:
            print(f"   ✅ Found: {obj_id}")
            with open(f"config_{obj_id}.json", "w") as f:
                f.write(result)
        else:
            print(f"   ❌ Not found: {obj_id}")
    
    print("\n" + "=" * 60)
    if found_products:
        print("🎉 SUCCESS! Found product data via Farmatodo API")
    else:
        print("⚠️ No product indices found yet. Need more investigation.")
    print("=" * 60)

if __name__ == "__main__":
    main()
