import requests
import json

# Load data
with open('Farmatodo_Reverse/endpoints.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

FIREBASE_URL = "https://oracle-services-vzla.firebaseio.com"
KUSTOMER_TOKEN = None

for item in data:
    if item['type'] == 'SOPORTE' and 'Token:' in item['headers'][0]:
        KUSTOMER_TOKEN = item['headers'][0].split('Token: ')[1].strip()
        break

def check_firebase():
    print("🔥 TESTING FIREBASE...")
    paths = ["", "rules", "config", "products", "stores", "tiendas", "sucursales", "promos"]
    for p in paths:
        url = f"{FIREBASE_URL}/{p}.json"
        try:
            r = requests.get(url, timeout=3)
            if r.status_code == 200:
                print(f"[OPEN] {url} - Size: {len(r.text)} bytes")
                if len(r.text) < 200: print(f"   -> Content: {r.text}")
            elif r.status_code == 401:
                pass # Secured
            else:
                print(f"[STATUS {r.status_code}] {url}")
        except:
            pass

def check_kustomer():
    print("\n💬 TESTING KUSTOMER TOKEN...")
    if not KUSTOMER_TOKEN:
        print("No token found.")
        return
    
    # Try a standard Kustomer API endpoint (identifying the user)
    # The URL usually depends on the organization, but we can try the base API
    url = "https://api.kustomerapp.com/v1/auth/current" 
    headers = {
        "Authorization": f"Bearer {KUSTOMER_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        r = requests.get(url, headers=headers, timeout=5)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅ Token is VALID and ACTIVE.")
            print(f"User Info: {r.text[:100]}...")
        else:
            print(f"Token invalid or endpoint wrong for this org. Resp: {r.text[:100]}")
    except Exception as e:
        print(f"Error testing Kustomer: {e}")

def check_public_web():
    print("\n🌐 TESTING PUBLIC WEB ROUTES...")
    # Analyzing checking if basic product routes exist without /api/v1
    test_urls = [
        "https://www.farmatodo.com.ve/producto/123",
        "https://www.farmatodo.com.ve/detalle/123",
        "https://www.farmatodo.com.ve/catalogo"
    ]
    
    for url in test_urls:
        try:
            r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=5)
            print(f"{url} -> {r.status_code}")
        except:
            print(f"{url} -> Error")

if __name__ == "__main__":
    check_firebase()
    check_kustomer()
    check_public_web()
