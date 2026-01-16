import requests
import json

APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"
INDEX_NAME = "products_vzla"
URL = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{INDEX_NAME}/query"

BASE_HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": API_KEY,
    "Referer": "https://www.farmatodo.com.ve/",
    "Origin": "https://www.farmatodo.com.ve",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "x-algolia-agent": "Algolia for JavaScript (4.5.1); Browser"
}

def test_payload(name, headers, data):
    print(f"\n🧪 Testing {name}...")
    try:
        response = requests.post(URL, headers=headers, data=data)
        if response.status_code == 200:
            hits = response.json().get('nbHits')
            print(f"   ✅ SUCCESS! Hits: {hits}")
        else:
            print(f"   ❌ Failed {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")

def main():
    # 1. JSON Body (Standard)
    # Failed previously 403
    
    # 2. JSON String with Form Header
    headers_form = BASE_HEADERS.copy()
    headers_form["Content-Type"] = "application/x-www-form-urlencoded"
    payload_dict = {"params": "query=Acetaminofen&hitsPerPage=1"}
    data_json_str = json.dumps(payload_dict)
    test_payload("JSON String + Form Header", headers_form, data_json_str)
    
    # 3. Form Data (Standard) -> params=...
    # requests `data` dict does this automatically
    test_payload("Form Data (Dict)", headers_form, payload_dict)
    
    # 4. Raw Query String as Body
    # Not likely for 'query' endpoint which usually takes JSON key 'params'
    
    # 5. GET Request (Algolia supports GET)
    # headers passed, params in URL
    print("\n🧪 Testing GET Request...")
    response = requests.get(URL, headers=BASE_HEADERS, params=payload_dict)
    if response.status_code == 200:
        print(f"   ✅ SUCCESS! Hits: {response.json().get('nbHits')}")
    else:
        print(f"   ❌ Failed {response.status_code}: {response.text}")

if __name__ == "__main__":
    main()
