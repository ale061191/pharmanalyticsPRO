#!/usr/bin/env python3
"""
Farmatodo API Scraper - Direct API Access
==========================================
Uses discovered API endpoints to extract product data directly from Farmatodo's backend.

Endpoints discovered:
- Algolia Search: https://api-search.farmatodo.com/1/indexes/*/queries
- Backend API: https://gw-backend-ve.farmatodo.com/_ah/api/
- Transactional API: https://api-transactional.farmatodo.com/
"""

import requests
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Optional, Any

# API Configuration
ALGOLIA_API = "https://api-search.farmatodo.com/1/indexes/*/queries"
BACKEND_API = "https://gw-backend-ve.farmatodo.com/_ah/api"
TRANSACTIONAL_API = "https://api-transactional.farmatodo.com"

# Headers to mimic the web app
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-VE,es;q=0.9,en;q=0.8",
    "Origin": "https://www.farmatodo.com.ve",
    "Referer": "https://www.farmatodo.com.ve/",
    "Content-Type": "application/json"
}

class FarmatodoAPIScraper:
    """Direct API scraper for Farmatodo Venezuela"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.products = []
        self.cities = []
        self.stores = []
        
    def get_categories(self) -> List[Dict]:
        """Fetch all categories and subcategories from the backend API"""
        url = f"{BACKEND_API}/categoryEndpoint/getCategoriesAndSubCategories"
        
        try:
            # Try POST first (common for Google App Engine APIs)
            response = self.session.post(url, json={}, timeout=30)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Fetched categories: {len(data.get('items', []))} found")
                return data.get('items', [])
        except Exception as e:
            print(f"POST failed: {e}")
        
        try:
            # Try GET as fallback
            response = self.session.get(url, timeout=30)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Fetched categories (GET): {len(data.get('items', []))} found")
                return data.get('items', [])
        except Exception as e:
            print(f"GET failed: {e}")
            
        return []
    
    def get_cities(self) -> List[Dict]:
        """Fetch active cities from the transactional API"""
        url = f"{TRANSACTIONAL_API}/catalog/r/VE/v1/cities/active/geo-zone/"
        
        try:
            response = self.session.get(url, timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.cities = data if isinstance(data, list) else data.get('cities', [])
                print(f"✅ Fetched cities: {len(self.cities)} found")
                return self.cities
        except Exception as e:
            print(f"❌ Error fetching cities: {e}")
            
        return []
    
    def get_stores_by_city(self, city_id: str) -> List[Dict]:
        """Fetch stores for a specific city"""
        url = f"{TRANSACTIONAL_API}/route/r/VE/v1/stores/nearby"
        params = {"cityId": city_id}
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                stores = data if isinstance(data, list) else data.get('stores', [])
                print(f"  📍 City {city_id}: {len(stores)} stores found")
                return stores
        except Exception as e:
            print(f"  ❌ Error fetching stores for {city_id}: {e}")
            
        return []
    
    def search_products_algolia(self, query: str, hits_per_page: int = 100) -> List[Dict]:
        """Search products using Algolia API"""
        payload = {
            "requests": [
                {
                    "indexName": "products_ve",
                    "query": query,
                    "params": f"hitsPerPage={hits_per_page}&page=0"
                }
            ]
        }
        
        try:
            response = self.session.post(ALGOLIA_API, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    hits = results[0].get('hits', [])
                    print(f"🔍 Search '{query}': {len(hits)} products found")
                    return hits
        except Exception as e:
            print(f"❌ Algolia search failed: {e}")
            
        return []
    
    def get_product_suggestions(self, query: str) -> List[Dict]:
        """Get product suggestions from backend API"""
        url = f"{BACKEND_API}/productEndpoint/getSuggests"
        payload = {"query": query}
        
        try:
            response = self.session.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                suggestions = data.get('items', [])
                print(f"💡 Suggestions for '{query}': {len(suggestions)} found")
                return suggestions
        except Exception as e:
            print(f"❌ Suggestions failed: {e}")
            
        return []
    
    def get_product_stock(self, product_id: str, city_id: str = "CCS") -> Dict:
        """Get stock availability for a product in a city"""
        url = f"{BACKEND_API}/orderEndpoint/priceDeliveryOrderAgile"
        payload = {
            "productId": product_id,
            "cityId": city_id,
            "quantity": 1
        }
        
        try:
            response = self.session.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"  ❌ Stock check failed for {product_id}: {e}")
            
        return {}
    
    def scrape_category(self, category_slug: str, max_pages: int = 10) -> List[Dict]:
        """Scrape all products from a category using search"""
        all_products = []
        
        # Search using category name
        products = self.search_products_algolia(category_slug, hits_per_page=100)
        
        for product in products:
            product_data = {
                "id": product.get("objectID"),
                "name": product.get("name"),
                "brand": product.get("brand"),
                "price": product.get("price"),
                "original_price": product.get("originalPrice"),
                "discount": product.get("discount"),
                "image_url": product.get("imageUrl"),
                "category": product.get("category"),
                "subcategory": product.get("subcategory"),
                "url": product.get("url"),
                "sku": product.get("sku"),
                "stock_status": product.get("stockStatus"),
                "rating": product.get("rating"),
                "reviews_count": product.get("reviewsCount")
            }
            all_products.append(product_data)
        
        return all_products
    
    def run_full_scrape(self, output_file: str = "precios_farmatodo.json"):
        """Run a complete scrape of all available data"""
        print("=" * 60)
        print("🚀 FARMATODO API SCRAPER - Starting Full Extraction")
        print("=" * 60)
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "source": "Farmatodo Venezuela API",
            "categories": [],
            "cities": [],
            "products": [],
            "stats": {}
        }
        
        # Step 1: Get categories
        print("\n📁 Step 1: Fetching Categories...")
        categories = self.get_categories()
        results["categories"] = categories
        
        # Step 2: Get cities and stores
        print("\n🏙️ Step 2: Fetching Cities and Stores...")
        cities = self.get_cities()
        results["cities"] = cities
        
        # Step 3: Search products by common pharma terms
        print("\n💊 Step 3: Searching for Products...")
        search_terms = [
            "acetaminofen", "ibuprofeno", "vitamina", "antibiotico",
            "analgesico", "antiinflamatorio", "jarabe", "crema",
            "medicamento", "farmacia", "salud"
        ]
        
        all_products = {}
        for term in search_terms:
            products = self.search_products_algolia(term, hits_per_page=100)
            for product in products:
                product_id = product.get("objectID")
                if product_id and product_id not in all_products:
                    all_products[product_id] = product
            time.sleep(0.5)  # Rate limiting
        
        results["products"] = list(all_products.values())
        
        # Stats
        results["stats"] = {
            "total_products": len(results["products"]),
            "total_categories": len(results["categories"]),
            "total_cities": len(results["cities"])
        }
        
        # Save results
        print(f"\n💾 Saving results to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print("\n" + "=" * 60)
        print("✅ SCRAPE COMPLETE!")
        print(f"   📦 Products: {results['stats']['total_products']}")
        print(f"   📁 Categories: {results['stats']['total_categories']}")
        print(f"   🏙️ Cities: {results['stats']['total_cities']}")
        print(f"   📄 Output: {output_file}")
        print("=" * 60)
        
        return results


def main():
    """Main entry point"""
    scraper = FarmatodoAPIScraper()
    
    # Test API endpoints
    print("🔬 Testing API Endpoints...\n")
    
    # Test categories
    categories = scraper.get_categories()
    
    # Test cities
    cities = scraper.get_cities()
    
    # Test Algolia search
    products = scraper.search_products_algolia("acetaminofen", hits_per_page=10)
    
    if products:
        print("\n📋 Sample Product Data:")
        for i, p in enumerate(products[:3]):
            print(f"  {i+1}. {p.get('name', 'N/A')}")
            print(f"     Price: {p.get('price', 'N/A')}")
            print(f"     Brand: {p.get('brand', 'N/A')}")
    
    # Run full scrape if APIs are working
    if products or categories or cities:
        print("\n" + "-" * 40)
        user_input = input("Run full scrape? (y/n): ").strip().lower()
        if user_input == 'y':
            scraper.run_full_scrape()
    else:
        print("\n⚠️ API endpoints may require authentication or have changed.")
        print("Consider using the web scraping approach instead.")


if __name__ == "__main__":
    main()
