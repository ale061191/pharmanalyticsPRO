import requests
import json
import urllib.parse

# Exact URL from capture
# https://gw-backend-ve.farmatodo.com/_ah/api/categoryEndpoint/getCategoriesAndSubCategories?token=...
BASE_URL = "https://gw-backend-ve.farmatodo.com/_ah/api"

# Credentials
API_KEY = "AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag"
TOKEN_ID_WEBSAFE = "ahZzfm9yYWNsZS1zZXJ2aWNlcy12emxhcl0LEgRVc2VyIiQ2NWVmZTNiZi0wMDFiLTQ5OGEtYmQxYS02MDhlMGNlOGM5MTUMCxIFVG9rZW4iJDk3MzNmYmI1LTc3M2YtNGJjNy04MWMzLWI4OGEyNjcxYTc2NQw"
TOKEN = "8a190e99b437184b4fb282c5ef31d9cc"

def test_connection():
    # Construct URL manually to ensure encoding is correct
    params = {
        "token": TOKEN,
        "tokenIdWebSafe": TOKEN_ID_WEBSAFE,
        "key": API_KEY
    }
    encoded_params = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/categoryEndpoint/getCategoriesAndSubCategories?{encoded_params}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
        "Referer": "https://www.farmatodo.com.ve/",
        "Origin": "https://www.farmatodo.com.ve",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site"
    }
    
    print(f" Requesting: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("SUCCESS! Data retrieved.")
            
            # Save categories
            with open('categories_direct.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
            return data
        else:
            print("Failed.")
            print(response.text[:500])
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    test_connection()
