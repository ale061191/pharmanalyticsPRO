import json

data = json.load(open('captured_stock_responses.json', 'r', encoding='utf-8'))

print("=== FULL RESPONSE ANALYSIS ===\n")

for r in data:
    url = r['url']
    body = r['body']
    
    # 1. nearbyStores endpoint
    if 'nearbyStores' in url or (isinstance(body, dict) and 'nearbyStores' in body):
        print("NEARBY STORES ENDPOINT:")
        print(f"  URL: {url}")
        if isinstance(body, dict) and 'nearbyStores' in body:
            stores = body['nearbyStores']
            print(f"  Count: {len(stores)} stores")
            for store in stores[:3]:
                print(f"    - {store}")
        print()
    
    # 2. Cities with stores (locations endpoint)
    if 'locations' in url.lower():
        print("CITIES/LOCATIONS ENDPOINT:")
        print(f"  URL: {url}")
        if isinstance(body, dict) and 'data' in body:
            cities = body['data']
            print(f"  Cities count: {len(cities)}")
            
            # Find a city with stores array
            for city in cities[:3]:
                city_id = city.get('cityId')
                city_name = city.get('name')
                stores = city.get('stores', [])
                
                print(f"\n  City: {city_id} - {city_name}")
                print(f"    Stores count: {len(stores)}")
                
                if stores:
                    print(f"    First store sample:")
                    print(json.dumps(stores[0], indent=6, ensure_ascii=False)[:600])
        print()

# 3. Look for product stock data
print("\n=== LOOKING FOR PRODUCT STOCK IN ALGOLIA ===")
for r in data:
    url = r['url']
    if 'algolia' in url.lower() or 'products' in url.lower():
        body = r['body']
        if isinstance(body, dict):
            # Check for stock fields
            stock_fields = ['stock', 'totalStock', 'storetotal', 'stores', 'availability']
            for sf in stock_fields:
                if sf in body:
                    print(f"  {sf}: {body[sf]}")
