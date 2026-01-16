import requests
import json

BASE_URL = "https://api-transactional.farmatodo.com/route/r/VE/v1/stores/nearby"
PRODUCT_ID = "23645003297"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.farmatodo.com.ve",
    "Referer": "https://www.farmatodo.com.ve/"
}

PARAMS_TO_TEST = [
    {"cityId": "CCS"}, # Baseline
    {"cityId": "CCS", "productId": PRODUCT_ID},
    {"cityId": "CCS", "sku": PRODUCT_ID},
    {"cityId": "CCS", "item": PRODUCT_ID},
    {"cityId": "CCS", "id": PRODUCT_ID},
    {"cityId": "CCS", "products": PRODUCT_ID},
    {"cityId": "CCS", "showStock": "true"},
    {"cityId": "CCS", "checkAvailability": "true", "productId": PRODUCT_ID}
]

def test_endpoints():
    print("Testing api-transactional endpoints...")
    
    for params in PARAMS_TO_TEST:
        print(f"\nTesting Params: {params}")
        try:
            r = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=5)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                # Check if response has stock info
                text_dump = json.dumps(data)
                if "stock" in text_dump.lower() or "availability" in text_dump.lower() or "cantidad" in text_dump.lower():
                    print("!!! POSSIBLE MATCH FOUND !!!")
                    print(text_dump[:500] + "...")
                else:
                    print("Response valid, but no obvious stock info.")
                    # print(text_dump[:200] + "...")
            else:
                print("Request failed.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_endpoints()
