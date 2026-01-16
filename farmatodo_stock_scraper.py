"""
Farmatodo Complete Stock Scraper
Combines Algolia API + Transactional API for comprehensive stock data

This scraper provides:
1. Product info from Algolia (stock, prices, metadata)
2. Store list from Transactional API
3. Stock per store requires browser interaction (map popup)
"""
import requests
import json
from datetime import datetime

# Algolia credentials (discovered from web scraping)
ALGOLIA_APP_ID = "VCOJEYD2PO"
ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011"
ALGOLIA_INDEX = "products"

# Transactional API base
API_BASE = "https://api-transactional.farmatodo.com"


class FarmatodoScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        })
        
        # Algolia headers
        self.algolia_headers = {
            "X-Algolia-Application-Id": ALGOLIA_APP_ID,
            "X-Algolia-API-Key": ALGOLIA_API_KEY,
            "Content-Type": "application/json"
        }
    
    def get_product_stock(self, product_id: str) -> dict:
        """
        Fetch product stock data from Algolia
        Returns: dict with stock info + product metadata
        """
        url = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/{ALGOLIA_INDEX}/{product_id}"
        
        try:
            response = self.session.get(url, headers=self.algolia_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Extract relevant fields
                return {
                    "product_id": product_id,
                    "name": data.get("description"),
                    "brand": data.get("marca"),
                    "price": data.get("fullPrice"),
                    "offer_price": data.get("offerPrice"),
                    "stock": {
                        "total": data.get("stock", 0),
                        "total_confirmed": data.get("totalStock", 0),
                        "stores_with_stock": data.get("storetotal", 0),
                        "stores_without_stock": data.get("storecero", 0),
                        "avg_stock": data.get("avg_stock", 0),
                        "max_stock": data.get("totalmax_stock", 0),
                        "available": not data.get("without_stock", True)
                    },
                    "category": data.get("categorie"),
                    "image_url": data.get("mediaImageUrl"),
                    "url": f"https://www.farmatodo.com.ve/producto/{data.get('url')}",
                    "fetched_at": datetime.now().isoformat()
                }
            else:
                return {"error": f"Product not found: {response.status_code}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def get_cities(self) -> list:
        """
        Fetch all active cities with their default stores
        """
        url = f"{API_BASE}/catalog/r/VE/v1/cities/active/geo-zone/?deliveryType=EXPRESS"
        
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                cities = data.get("data", [])
                
                return [{
                    "city_id": city.get("cityId"),
                    "name": city.get("name"),
                    "default_store_id": city.get("defaultStoreId"),
                    "latitude": city.get("latitude"),
                    "longitude": city.get("longitude")
                } for city in cities]
            else:
                return []
        except Exception as e:
            print(f"Error fetching cities: {e}")
            return []
    
    def get_nearby_stores(self, city_id: str) -> list:
        """
        Fetch stores near a specific city
        """
        url = f"{API_BASE}/route/r/VE/v1/stores/nearby?cityId={city_id}"
        
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                stores = data.get("nearbyStores", [])
                
                return [{
                    "id": store.get("id"),
                    "name": store.get("name"),
                    "city": store.get("city"),
                    "address": store.get("address"),
                    "latitude": store.get("latitude"),
                    "longitude": store.get("longitude"),
                    "distance_km": store.get("distanceInKm")
                } for store in stores]
            else:
                return []
        except Exception as e:
            print(f"Error fetching stores for {city_id}: {e}")
            return []
    
    def search_products(self, query: str, limit: int = 20) -> list:
        """
        Search for products in Algolia
        """
        url = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/{ALGOLIA_INDEX}/query"
        payload = {
            "params": f"query={query}&hitsPerPage={limit}"
        }
        
        try:
            response = self.session.post(url, headers=self.algolia_headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                hits = data.get("hits", [])
                
                return [{
                    "object_id": hit.get("objectID"),
                    "name": hit.get("description"),
                    "price": hit.get("fullPrice"),
                    "stock": hit.get("stock", 0),
                    "stores_with_stock": hit.get("storetotal", 0),
                    "available": not hit.get("without_stock", True)
                } for hit in hits]
            else:
                return []
        except Exception as e:
            print(f"Error searching: {e}")
            return []


def main():
    scraper = FarmatodoScraper()
    
    print("=" * 60)
    print("FARMATODO STOCK SCRAPER")
    print("=" * 60)
    
    # 1. Get product stock from Algolia
    product_id = "23645003297"  # Acetaminofén
    print(f"\n[1] Fetching product stock for ID: {product_id}")
    product = scraper.get_product_stock(product_id)
    
    if "error" not in product:
        print(f"    Name: {product['name']}")
        print(f"    Price: ${product['price']} (Offer: ${product['offer_price']})")
        print(f"    Total Stock: {product['stock']['total']} units")
        print(f"    Stores with stock: {product['stock']['stores_with_stock']}")
        print(f"    Stores without stock: {product['stock']['stores_without_stock']}")
        print(f"    Avg stock per store: {product['stock']['avg_stock']}")
        print(f"    Available: {'Yes' if product['stock']['available'] else 'No'}")
    else:
        print(f"    Error: {product['error']}")
    
    # 2. Get cities
    print(f"\n[2] Fetching active cities...")
    cities = scraper.get_cities()
    print(f"    Found {len(cities)} cities")
    for city in cities[:5]:
        print(f"      - {city['city_id']}: {city['name']} (Store ID: {city['default_store_id']})")
    if len(cities) > 5:
        print(f"      ... and {len(cities) - 5} more")
    
    # 3. Get stores for Caracas
    print(f"\n[3] Fetching stores for Caracas (CCS)...")
    stores = scraper.get_nearby_stores("CCS")
    print(f"    Found {len(stores)} nearby stores")
    for store in stores[:5]:
        print(f"      - {store['id']}: {store['name']} ({store['address'][:50]}...)")
    
    # 4. Search products
    print(f"\n[4] Searching for 'Losartan'...")
    results = scraper.search_products("Losartan", limit=5)
    print(f"    Found {len(results)} products")
    for r in results:
        status = "✓" if r['available'] else "✗"
        print(f"      {status} {r['name'][:50]}... Stock: {r['stock']} ({r['stores_with_stock']} tiendas)")
    
    # Save full product data
    print(f"\n[5] Saving complete product data to 'product_stock_data.json'...")
    output = {
        "product": product,
        "cities_count": len(cities),
        "stores_ccs": stores,
        "search_results": results,
        "scraped_at": datetime.now().isoformat()
    }
    with open("product_stock_data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print("    Done!")
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"""
The scraper successfully retrieved:
- Product stock data from Algolia (aggregated national-level)
- List of {len(cities)} active cities
- List of {len(stores)} stores in Caracas

LIMITATION: Per-store stock availability requires browser 
interaction with the map popup on the product page.
The Algolia data provides aggregate metrics only.
    """)


if __name__ == "__main__":
    main()
