import json

data = json.load(open('captured_stock_responses.json', 'r', encoding='utf-8'))
print(f'Found {len(data)} responses\n')

# Find responses with stores/nearbyStores data
for i, r in enumerate(data):
    url = r['url']
    body = r['body']
    
    # Check if this contains store information
    has_stores = False
    store_key = None
    
    if isinstance(body, dict):
        for k, v in body.items():
            if 'store' in k.lower() or 'sucursal' in k.lower() or 'nearby' in k.lower():
                has_stores = True
                store_key = k
                break
    
    if has_stores:
        print(f'=== STORE DATA FOUND ===')
        print(f'URL: {url}')
        print(f'Key: {store_key}')
        
        if isinstance(body.get(store_key), list):
            stores = body[store_key]
            print(f'Count: {len(stores)} stores')
            if stores and isinstance(stores[0], dict):
                print(f'First store: {json.dumps(stores[0], indent=2, ensure_ascii=False)[:500]}')
        else:
            print(f'Value: {body.get(store_key)}')
        print()

# Also check for cities/geo data that might have stores nested
print('\n=== LOOKING FOR NESTED STORES IN CITIES ===')
for r in data:
    url = r['url']
    body = r['body']
    
    if 'cities' in url.lower() or 'geo-zone' in url.lower():
        print(f'URL: {url[:80]}')
        if isinstance(body, dict) and 'data' in body:
            cities = body['data']
            if isinstance(cities, list) and len(cities) > 0:
                first_city = cities[0]
                print(f'  First city: {first_city.get("cityId")} - {first_city.get("name")}')
                if 'stores' in first_city:
                    print(f'  Has stores array!')
                if 'defaultStoreId' in first_city:
                    print(f'  Default store ID: {first_city.get("defaultStoreId")}')
        print()
