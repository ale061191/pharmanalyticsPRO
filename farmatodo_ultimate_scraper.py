import requests
import json
import time

class FarmatodoScraper:
    def __init__(self):
        self.app_id = "VCOJEYD2PO"
        self.api_key = "869a91e98550dd668b8b1dc04bca9011"
        self.index_name = "products_vzla"
        self.base_url = f"https://{self.app_id}-dsn.algolia.net/1/indexes/{self.index_name}/query"
        
        self.headers = {
            "X-Algolia-Application-Id": self.app_id,
            "X-Algolia-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Referer": "https://www.farmatodo.com.ve/",
            "Origin": "https://www.farmatodo.com.ve",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "x-algolia-agent": "Algolia for JavaScript (4.5.1); Browser"
        }

    def search(self, query, page=0, hits_per_page=50):
        """
        Search for products using the Algolia API.
        """
        payload = {
            "params": f"query={query}&page={page}&hitsPerPage={hits_per_page}&attributesToRetrieve=description,id,brand,fullPrice,offerPrice,stock,mediaImageUrl,categorie"
        }
        
        try:
            print(f"🔍 Searching: '{query}' (Page {page})...")
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            hits = data.get('hits', [])
            stats = {
                'total_hits': data.get('nbHits', 0),
                'pages': data.get('nbPages', 0),
                'current_hits': len(hits)
            }
            return hits, stats
            
        except Exception as e:
            print(f"❌ Error searching '{query}': {e}")
            return [], {}

    def fetch_all(self, query):
        """
        Fetch ALL results for a query by paginating.
        """
        all_products = []
        page = 0
        
        while True:
            hits, stats = self.search(query, page=page)
            if not hits:
                break
                
            for hit in hits:
                # Normalize Data
                product = {
                    'id': hit.get('id'),
                    'name': hit.get('description'),
                    'brand': hit.get('brand'),
                    'price': hit.get('offerPrice') or hit.get('fullPrice'),
                    'original_price': hit.get('fullPrice'),
                    'stock': hit.get('stock'),
                    'category': hit.get('categorie'),
                    'image': hit.get('mediaImageUrl')
                }
                all_products.append(product)
            
            # Pagination check
            if page >= stats['pages'] - 1:
                break
            page += 1
            time.sleep(0.5) # Be polite
            
        print(f"✅ Downloaded {len(all_products)} products total.")
        return all_products

def main():
    scraper = FarmatodoScraper()
    
    # Example usage:
    # 1. Search for a specific term
    products = scraper.fetch_all("Acetaminofen")
    
    # 2. Print top 5 results
    print("\n--- Top Results ---")
    for p in products[:5]:
        print(f"[{p['stock']}] {p['name']} - Bs. {p['price']}")
    
    # 3. Save to JSON
    with open('farmatodo_products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
        print("\nSaved to farmatodo_products.json")

if __name__ == "__main__":
    main()
