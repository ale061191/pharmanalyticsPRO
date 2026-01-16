import requests
import json

APP_ID = 'VCOJEYD2PO'
API_KEY = '869a91e98550dd668b8b1dc04bca9011'

# Try to list all indices (if permitted)
url = f'https://{APP_ID}-dsn.algolia.net/1/indexes'
headers = {
    'X-Algolia-Application-Id': APP_ID,
    'X-Algolia-API-Key': API_KEY
}

r = requests.get(url, headers=headers, timeout=10)
print(f'Status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print('Available indices:')
    for idx in data.get('items', []):
        print(f"  - {idx.get('name')}: {idx.get('entries', 'N/A')} entries")
else:
    print(f'Error: {r.text[:500]}')

# Also try common store index names
STORE_INDICES = [
    'stores',
    'stores-venezuela', 
    'sucursales',
    'tiendas',
    'branches',
    'locations',
    'farmacias'
]

print('\n=== Testing Store Indices ===')
for index in STORE_INDICES:
    search_url = f'https://{APP_ID}-dsn.algolia.net/1/indexes/{index}/query'
    payload = {"params": "query=&hitsPerPage=1"}
    try:
        r = requests.post(search_url, headers={**headers, 'Content-Type': 'application/json'}, json=payload, timeout=5)
        if r.status_code == 200:
            hits = r.json().get('nbHits', 0)
            print(f'  {index}: {hits} records found!')
            if hits > 0:
                sample = r.json().get('hits', [])[0]
                print(f'    Sample keys: {list(sample.keys())[:10]}')
        else:
            print(f'  {index}: {r.status_code}')
    except Exception as e:
        print(f'  {index}: Error - {e}')
