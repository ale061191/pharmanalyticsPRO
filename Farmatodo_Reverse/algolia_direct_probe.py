"""
Direct Algolia API Query for Farmatodo Venezuela
Uses credentials extracted from web traffic analysis
"""
import requests
import json

# Credentials extracted from web_api_intercept.json
ALGOLIA_APP_ID = "VCOJEYD2PO"
ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011"

# Possible indices based on Farmatodo's naming conventions
INDICES_TO_TRY = [
    "products-vzla",       # Most likely product index
    "productos-vzla",      # Spanish variant
    "farmatodo-vzla",      # Brand based
    "properties-vzla",     # Already seen in traffic (config)
    "catalogo-vzla",       # Catalog
    "inventory-vzla",      # Inventory
    "stock-vzla",          # Stock
]

def search_algolia(index_name, query="", hits_per_page=3):
    """
    Execute a search query against an Algolia index
    """
    url = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/{index_name}/query"
    
    headers = {
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "hitsPerPage": hits_per_page
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        return response.status_code, response.json()
    except requests.exceptions.JSONDecodeError:
        return response.status_code, {"error": "Not JSON", "text": response.text[:200]}
    except Exception as e:
        return -1, {"error": str(e)}

def list_indices():
    """
    Try to list all available indices
    """
    url = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes"
    
    headers = {
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        return response.status_code, response.json()
    except Exception as e:
        return -1, {"error": str(e)}

def main():
    print("=" * 60)
    print("🔍 ALGOLIA DIRECT API PROBE - FARMATODO VENEZUELA")
    print("=" * 60)
    print(f"App ID: {ALGOLIA_APP_ID}")
    print(f"API Key: {ALGOLIA_API_KEY[:20]}...")
    print()
    
    # Step 1: Try to list all indices
    print("\n📋 STEP 1: Listing available indices...")
    status, result = list_indices()
    if status == 200 and "items" in result:
        print(f"✅ Found {len(result['items'])} indices!")
        for idx in result.get("items", []):
            print(f"   - {idx.get('name', 'unknown')}")
        
        # Update our list with real indices
        real_indices = [idx.get('name') for idx in result.get("items", []) if idx.get('name')]
    else:
        print(f"⚠️ Could not list indices (Status: {status})")
        print(f"   Using predefined list...")
        real_indices = INDICES_TO_TRY
    
    # Step 2: Probe each index
    print("\n🔎 STEP 2: Probing indices for products...")
    found_products = False
    
    for index in real_indices:
        print(f"\n🎯 Trying: {index}")
        
        # Try a blank query first
        status, result = search_algolia(index, "", 2)
        
        if status == 200 and "hits" in result and len(result["hits"]) > 0:
            print(f"   ✅ SUCCESS! Got {result.get('nbHits', 'unknown')} total hits")
            found_products = True
            
            # Show first product
            hit = result["hits"][0]
            print(f"   First hit keys: {list(hit.keys())[:10]}...")
            
            # Check for stock-related fields
            stock_fields = [k for k in hit.keys() if "stock" in k.lower() or "inventory" in k.lower() or "availab" in k.lower()]
            if stock_fields:
                print(f"   🔥 STOCK FIELDS FOUND: {stock_fields}")
            
            # Check for product name
            for name_field in ["name", "mediaDescription", "title", "productName"]:
                if name_field in hit:
                    print(f"   Product: {hit[name_field][:80]}...")
                    break
            
            # Save full result
            output_file = f"algolia_{index}_sample.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"   💾 Saved to {output_file}")
            
        elif status == 200:
            print(f"   ⚠️ Index exists but returned 0 hits")
        else:
            print(f"   ❌ Status {status}: {result.get('message', result.get('error', 'Unknown'))[:50]}")
    
    if found_products:
        print("\n" + "=" * 60)
        print("🎉 SUCCESS! Found product data via Algolia!")
        print("Check the generated JSON files for product structure.")
        print("=" * 60)
    else:
        print("\n❌ No product data found in any index.")

if __name__ == "__main__":
    main()
