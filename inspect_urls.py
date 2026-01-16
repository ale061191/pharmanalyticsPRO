import json

def inspect_traffic():
    try:
        with open('farmatodo_output/api_traffic.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Total calls: {len(data.get('calls', []))}")
        
        for call in data.get('calls', []):
            url = call.get('url', '')
            if 'algolia' in url.lower() or 'api-search' in url.lower():
                print(f"\nURL: {url}")
                print(f"Data: {str(call.get('data', ''))[:200]}") # Print start of data
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_traffic()
