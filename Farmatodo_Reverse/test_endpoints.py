import requests
import json

ENDPOINTS = [
    {
        "url": "https://oracle-services-vzla.firebaseio.com/.json",
        "name": "Firebase Database (Root)"
    },
    {
        "url": "https://farmatodo.com.ve/api/v1/products",
        "name": "Farmatodo Catalog API (Inferred)"
    },
    {
        "url": "https://farmatodo.com.ve",
        "name": "Main Site"
    },
    {
        "url": "https://sdk.iad-06.braze.com/api/v3/content_cards/sync",
        "name": "Braze API"
    }
]

def test_endpoints():
    print("🚀 Testing Farmatodo Endpoints...\n")
    
    for ep in ENDPOINTS:
        try:
            print(f"Testing {ep['name']} ({ep['url']})...")
            response = requests.get(ep['url'], timeout=5)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("✅ ACCESS - Content Length:", len(response.text))
            elif response.status_code == 401:
                print("🔒 AUTH REQUIRED (Expected)")
            elif response.status_code == 403:
                print("⛔ FORBIDDEN")
            else:
                print(f"⚠️ {response.status_code}")
        except Exception as e:
            print(f"❌ FAILED: {str(e)}")
        print("-" * 30)

if __name__ == "__main__":
    test_endpoints()
