import requests
import json
import urllib.parse

# Exact URL params from successful traffic capture
# (Adjusted slightly to be cleaner)
BASE_URL = "https://gw-backend-ve.farmatodo.com/_ah/api"

PARAMS = {
    "token": "8a190e99b437184b4fb282c5ef31d9cc",
    "tokenIdWebSafe": "ahZzfm9yYWNsZS1zZXJ2aWNlcy12emxhcl0LEgRVc2VyIiQ2NWVmZTNiZi0wMDFiLTQ5OGEtYmQxYS02MDhlMGNlOGM5MTUMCxIFVG9rZW4iJDk3MzNmYmI1LTc3M2YtNGJjNy04MWMzLWI4OGEyNjcxYTc2NQw",
    "key": "AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Origin": "https://www.farmatodo.com.ve",
    "Referer": "https://www.farmatodo.com.ve/"
}

def probe_endpoint(endpoint_suffix, method="GET", extra_params={}):
    url = f"{BASE_URL}/{endpoint_suffix}"
    
    # Merge params
    current_params = PARAMS.copy()
    current_params.update(extra_params)
    
    encoded_params = urllib.parse.urlencode(current_params)
    full_url = f"{url}?{encoded_params}"
    
    print(f"[{method}] Probing: {endpoint_suffix} ...")
    
    try:
        response = requests.get(full_url, headers=HEADERS)
        print(f"   -> Status: {response.status_code}")
        if response.status_code == 200:
            print("   -> SUCCESS!")
            try:
                data = response.json()
                print(f"   -> Keys: {list(data.keys())}")
                return data
            except:
                print("   -> Not JSON")
        elif response.status_code == 404:
            print("   -> Not Found")
        elif response.status_code == 500:
            print("   -> Server Error (Method might exist but params wrong)")
        else:
            print(f"   -> Error: {response.text[:100]}")
            
    except Exception as e:
        print(f"   -> Exception: {e}")

def main():
    print("=== Farmatodo Endpoint Discovery ===")
    
    # 1. Verify Category Endpoint (Known Good)
    print("\n1. Verifying Known Endpoint:")
    probe_endpoint("categoryEndpoint/getCategoriesAndSubCategories")
    
    # 2. Probe Product Endpoints (Guesses)
    print("\n2. Probing Product Endpoints (Category ID 42 - Dolor de garganta):")
    # Trying different naming conventions common in Google Cloud Endpoints
    
    candidates = [
        "productEndpoint/getProductsByCategory",
        "productEndpoint/list",
        "productEndpoint/search",
        "categoryEndpoint/getProducts",
        "catalogEndpoint/getProductsByCategory",
        "inventoryEndpoint/getProducts"
    ]
    
    for cand in candidates:
        probe_endpoint(cand, extra_params={"idCategory": "42", "categoryId": "42", "id": "42"})
        
    # 3. Probe with 'search' params
    print("\n3. Probing Search:")
    probe_endpoint("productEndpoint/search", extra_params={"query": "atamel", "text": "atamel"})

if __name__ == "__main__":
    main()
