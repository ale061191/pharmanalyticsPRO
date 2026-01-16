import json

# Load captured responses
data = json.load(open('captured_stock_responses.json', encoding='utf-8'))

print("=" * 80)
print("ALL CAPTURED API ENDPOINTS")
print("=" * 80)

for i, r in enumerate(data):
    url = r['url']
    status = r.get('status', 'N/A')
    body = r.get('body', {})
    
    # Check size of body
    body_size = len(str(body))
    
    print(f"\n[{i+1}] Status: {status}")
    print(f"    URL: {url[:100]}")
    print(f"    Body size: {body_size} chars")
    
    # If body has data, show keys
    if isinstance(body, dict):
        keys = list(body.keys())[:5]
        print(f"    Keys: {keys}")
        
        # Look for stores array
        if 'stores' in str(body).lower():
            print(f"    *** CONTAINS 'stores' ***")
        if 'stock' in str(body).lower():
            print(f"    *** CONTAINS 'stock' ***")
    
print("\n" + "=" * 80)
print("LOOKING FOR LOCATIONS ENDPOINT WITH STORES")
print("=" * 80)

for r in data:
    url = r['url']
    body = r['body']
    
    if 'locations' in url.lower():
        print(f"\nURL: {url}")
        if isinstance(body, dict) and 'data' in body:
            cities = body['data']
            print(f"  Cities count: {len(cities)}")
            
            # Find if any city has stores
            for city in cities[:5]:
                stores = city.get('stores', [])
                if stores:
                    print(f"\n  City: {city.get('name')} has {len(stores)} stores!")
                    print(f"  First store sample:")
                    store = stores[0]
                    for k, v in list(store.items())[:10]:
                        print(f"    {k}: {str(v)[:60]}")
                    break
