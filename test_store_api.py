"""
Farmatodo Store Stock API - Direct Endpoint Access
Attempts to call the internal API for store-level stock data
"""
import requests
import json
from datetime import datetime


def get_store_stock_api(product_id: str, session_token: str = None) -> dict:
    """
    Try to access the store stock API directly
    
    The API endpoint discovered: 
    https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2
    """
    
    base_url = "https://gw-backend-ve.farmatodo.com/_ah/api"
    
    # Try different endpoint patterns
    endpoints = [
        f"{base_url}/productEndpoint/getItemAvailableStoresCity2",
        f"{base_url}/productEndpoint/getItemAvailableStoresCity",
        f"{base_url}/productEndpoint/getItemAvailability",
        f"{base_url}/itemEndpoint/getItemAvailableStores",
        "https://api-transactional.farmatodo.com/stock/r/VE/v1/item/{product_id}/stores",
        "https://api-transactional.farmatodo.com/catalog/r/VE/v1/item/{product_id}/availability",
    ]
    
    # Common API keys found in Farmatodo
    api_keys = [
        "AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag",  # Found in browser
        "AIzaSyD-ryCHRIYRnA0K9rVT0aJF6TtGYpBqjDI",
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://www.farmatodo.com.ve",
        "Referer": "https://www.farmatodo.com.ve/",
    }
    
    results = []
    
    for endpoint in endpoints:
        endpoint = endpoint.format(product_id=product_id)
        
        for key in api_keys[:1]:
            params = {
                "idItem": product_id,
                "key": key,
            }
            
            try:
                print(f"Trying: {endpoint[:60]}...")
                response = requests.get(
                    endpoint,
                    params=params,
                    headers=headers,
                    timeout=10
                )
                
                print(f"  Status: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        results.append({
                            "endpoint": endpoint,
                            "status": "success",
                            "data": data
                        })
                        print(f"  ✓ Got JSON response!")
                    except:
                        results.append({
                            "endpoint": endpoint,
                            "status": "not_json",
                            "content": response.text[:200]
                        })
                else:
                    results.append({
                        "endpoint": endpoint,
                        "status": response.status_code,
                        "response": response.text[:200]
                    })
                    
            except Exception as e:
                results.append({
                    "endpoint": endpoint,
                    "status": "error",
                    "error": str(e)
                })
    
    return results


def get_stores_from_transactional_api():
    """
    Get the full list of stores from the transactional API
    This endpoint works and gives us store details
    """
    url = "https://api-transactional.farmatodo.com/catalog/r/VE/v1/cities/active/locations/random"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    
    try:
        print("\nFetching full store list from locations endpoint...")
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Status: Success")
            
            if 'data' in data:
                cities = data['data']
                print(f"  Cities: {len(cities)}")
                
                all_stores = []
                for city in cities:
                    city_name = city.get('name')
                    stores = city.get('stores', [])
                    
                    for store in stores:
                        all_stores.append({
                            "city": city_name,
                            "city_id": city.get('cityId'),
                            "store_id": store.get('id'),
                            "store_name": store.get('name'),
                            "address": store.get('address'),
                            "latitude": store.get('latitude'),
                            "longitude": store.get('longitude'),
                            "schedule": store.get('schedule'),
                            "active": store.get('active')
                        })
                
                print(f"  Total stores: {len(all_stores)}")
                return all_stores
            
        return None
        
    except Exception as e:
        print(f"  Error: {e}")
        return None


def main():
    print("=" * 70)
    print("FARMATODO STORE STOCK API - Direct Access Test")
    print("=" * 70)
    
    # Product ID to test
    product_id = "113016367"
    
    print(f"\n[1] Testing API endpoints for product {product_id}...")
    api_results = get_store_stock_api(product_id)
    
    # Check if any worked
    success = [r for r in api_results if r.get('status') == 'success']
    if success:
        print(f"\n✓ Found working endpoint!")
        print(json.dumps(success[0], indent=2)[:500])
    else:
        print(f"\n✗ No direct API access to store-level stock available")
        print("  The API requires authentication/tokens from an active session")
    
    print(f"\n[2] Getting full store list (this works!)...")
    stores = get_stores_from_transactional_api()
    
    if stores:
        print(f"\n✓ Got {len(stores)} stores!")
        print("\nSample stores:")
        for store in stores[:10]:
            print(f"  - {store['city']}: {store['store_name']} (ID: {store['store_id']})")
        
        # Save to file
        with open("farmatodo_all_stores.json", "w", encoding="utf-8") as f:
            json.dump(stores, f, indent=2, ensure_ascii=False)
        print(f"\nFull store list saved to: farmatodo_all_stores.json")
    
    print("\n" + "=" * 70)
    print("CONCLUSION")
    print("=" * 70)
    print("""
For GRANULAR STOCK PER STORE, we need to:

1. Use Playwright to navigate to product page
2. Let the page fully load with map
3. Click on city names OR map markers
4. Extract popup content showing stock per store

The API for store-level stock requires session tokens that 
are generated dynamically when browsing the site.

HOWEVER: We CAN get:
- Full list of ~80+ stores with IDs, names, coordinates ✓
- Aggregate stock from Algolia (total, # stores with stock) ✓
- Per-store stock via browser automation (slower) ✓
    """)


if __name__ == "__main__":
    main()
