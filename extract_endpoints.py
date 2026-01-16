import json

data = json.load(open('captured_stock_responses.json', 'r', encoding='utf-8'))

# Extract unique API endpoints
print("=== UNIQUE API ENDPOINTS ===")
endpoints = set()
for r in data:
    url = r['url'].split('?')[0]  # Remove query params
    endpoints.add(url)

for ep in sorted(endpoints):
    print(ep)

print("\n\n=== STORES DATA STRUCTURE ===")

# Find the locations endpoint with full stores data
for r in data:
    if 'locations' in r['url']:
        body = r['body']
        if isinstance(body, dict) and 'data' in body:
            cities = body['data']
            
            # Get first city with stores
            for city in cities:
                stores = city.get('stores', [])
                if stores:
                    print(f"City: {city.get('cityId')} - {city.get('name')}")
                    print(f"Number of stores: {len(stores)}")
                    print(f"\nFirst store structure:")
                    store = stores[0]
                    for key, val in store.items():
                        val_str = str(val)
                        if len(val_str) > 80:
                            val_str = val_str[:80] + "..."
                        print(f"  {key}: {val_str}")
                    break
            break

print("\n\n=== NEARBY STORES ENDPOINT ===")
for r in data:
    if 'nearby' in r['url']:
        print(f"URL: {r['url']}")
        body = r['body']
        if 'nearbyStores' in body:
            stores = body['nearbyStores']
            print(f"Number of nearby stores: {len(stores)}")
            if stores:
                print(f"Store structure: {stores[0]}")
