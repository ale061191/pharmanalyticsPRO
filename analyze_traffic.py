import json
from urllib.parse import urlparse, parse_qs

def analyze_traffic():
    try:
        with open('farmatodo_output/api_traffic.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Loaded {len(data['calls'])} captured calls")
        
        tokens = set()
        keys = set()
        endpoints = set()
        algolia_creds = set()
        
        for call in data['calls']:
            url = call['url']
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            
            # Extract query params
            qs = parse_qs(parsed.query)
            
            if 'tokenIdWebSafe' in qs:
                tokens.add(qs['tokenIdWebSafe'][0])
            if 'key' in qs:
                keys.add(qs['key'][0])
            if 'x-algolia-api-key' in qs: # Check query params just in case
                algolia_creds.add(qs['x-algolia-api-key'][0])
                
            # Check for interesting endpoints
            if 'gw-backend' in base_url or 'api-search' in base_url or 'transactional' in base_url:
                endpoints.add(base_url)
                
        print("\n=== Found Tokens (tokenIdWebSafe) ===")
        for t in tokens:
            print(t)
            
        print("\n=== Found API Keys ===")
        for k in keys:
            print(k)
            
        print("\n=== Interesting Endpoints ===")
        for e in sorted(endpoints):
            print(e)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_traffic()
