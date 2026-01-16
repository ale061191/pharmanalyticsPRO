import requests
import json
import time
from datetime import datetime

# Credentials extracted from traffic
API_KEY = "AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag"
TOKEN_ID_WEBSAFE = "ahZzfm9yYWNsZS1zZXJ2aWNlcy12emxhcl0LEgRVc2VyIiQ2NWVmZTNiZi0wMDFiLTQ5OGEtYmQxYS02MDhlMGNlOGM5MTUMCxIFVG9rZW4iJDk3MzNmYmI1LTc3M2YtNGJjNy04MWMzLWI4OGEyNjcxYTc2NQw"
TOKEN = "8a190e99b437184b4fb282c5ef31d9cc"

# Endpoints
BASE_URL = "https://gw-backend-ve.farmatodo.com/_ah/api"
CATEGORIES_URL = f"{BASE_URL}/categoryEndpoint/getCategoriesAndSubCategories"
PRODUCTS_BY_CAT_URL = f"{BASE_URL}/productEndpoint/getProductsByCategory" # Educated guess based on naming conventions, will test.
# Alternative: Search endpoint
SEARCH_URL = f"{BASE_URL}/productEndpoint/search"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

def get_categories():
    params = {
        "token": TOKEN,
        "tokenIdWebSafe": TOKEN_ID_WEBSAFE,
        "key": API_KEY
    }
    
    print(f"Fetching categories from {CATEGORIES_URL}...")
    try:
        response = requests.get(CATEGORIES_URL, params=params, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        
        # Save raw dump for debugging
        with open('debug_categories.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print("Categories fetched successfully.")
        return data
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return None

def main():
    print("=== Farmatodo Direct API Scraper ===")
    
    # 1. Fetch Categories
    cat_data = get_categories()
    
    if not cat_data or 'departmentList' not in cat_data:
        print("Failed to retrieve category list.")
        return

    departments = cat_data.get('departmentList', [])
    print(f"Found {len(departments)} departments.")
    
    # Print hierarchy
    for dep in departments:
        print(f"\n[Dep] {dep.get('name')} (ID: {dep.get('id')})")
        for cat in dep.get('children', []):
            print(f"  - {cat.get('name')} (ID: {cat.get('id')})")
            # We could recurse further for sub-sub categories if they exist
            
    # Logic to fetch products for a specific category would go here
    # We need to verify the product endpoint first. 
    # Usually it's something like getProductsByCategory?idCategory=XX
    
if __name__ == "__main__":
    main()
