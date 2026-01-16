import json

data = json.load(open('captured_stock_responses.json', 'r', encoding='utf-8'))
print(f'Found {len(data)} responses:\n')

for i, r in enumerate(data):
    url = r['url']
    status = r['status']
    body = r['body']
    
    print(f'[{i}] Status {status}: {url[:100]}')
    
    if isinstance(body, dict):
        keys = list(body.keys())
        print(f'    Keys: {keys[:5]}')
        
        # Look for arrays with store data
        for k, v in body.items():
            if isinstance(v, list) and len(v) > 0:
                print(f'    -> {k}: {len(v)} items')
                if isinstance(v[0], dict):
                    print(f'       First item keys: {list(v[0].keys())[:8]}')
    print()
