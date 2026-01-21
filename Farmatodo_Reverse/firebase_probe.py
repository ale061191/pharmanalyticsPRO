"""
Direct Firebase Realtime Database Probe
Attempts to access the Farmatodo Firebase DB directly
"""
import requests
import json

FIREBASE_URL = "https://oracle-services-vzla.firebaseio.com"

def probe():
    print("🔥 Probing Firebase Realtime Database directly...")
    print(f"Target: {FIREBASE_URL}")
    print("-" * 50)
    
    # Common Firebase paths to try
    paths = [
        "/.json",           # Root (often blocked)
        "/products.json",   # Common product path
        "/productos.json",  # Spanish variant
        "/stock.json",      # Stock data
        "/inventario.json", # Inventory
        "/tiendas.json",    # Stores
        "/stores.json",
        "/config.json",     # App config
        "/api.json",        
    ]
    
    for path in paths:
        url = f"{FIREBASE_URL}{path}"
        try:
            print(f"\n📡 Trying: {url}")
            response = requests.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data is not None and data != "null":
                    print(f"   🎯 SUCCESS! Data found:")
                    # Truncate if too large
                    data_str = json.dumps(data, indent=2)
                    if len(data_str) > 500:
                        print(f"   {data_str[:500]}...")
                        print(f"   (... truncated, total {len(data_str)} chars)")
                    else:
                        print(f"   {data_str}")
                    
                    # Save to file
                    with open(f"firebase_{path.replace('/', '_').replace('.json', '')}_dump.json", "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    print(f"   💾 Saved to file!")
                else:
                    print(f"   ⚠️ Empty/null response")
            elif response.status_code == 401:
                print(f"   🔒 Requires authentication")
            elif response.status_code == 403:
                print(f"   🚫 Forbidden (rules blocking)")
            else:
                print(f"   ❌ {response.text[:100] if response.text else 'No response body'}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("Probe complete.")

if __name__ == "__main__":
    probe()
