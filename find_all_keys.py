import json
import re

def run():
    with open('farmatodo_output/api_traffic.json', 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find all potential keys (32 hex chars)
    keys = set(re.findall(r'[\'"]([a-f0-9]{32})[\'"]', content))
    # Find standard Algolia keys (often longer or different)
    
    # Find headers
    headers = set(re.findall(r'x-algolia-api-key["\'\s:]+([a-zA-Z0-9]+)', content, re.IGNORECASE))
    
    # Find index names
    indices = set(re.findall(r'indexes/([a-zA-Z0-9_-]+)', content))
    
    print("Potential Keys found:", len(keys))
    for k in keys:
        print(f"Key: {k}")
        
    print("\nHeader Keys found:", len(headers))
    for k in headers:
        print(f"Header Key: {k}")
        
    print("\nIndices found:", len(indices))
    for i in indices:
        print(f"Index: {i}")

if __name__ == "__main__":
    run()
