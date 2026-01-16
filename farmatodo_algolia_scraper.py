from algoliasearch.search_client import SearchClient
import json

# Credentials extracted from Farmatodo
APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"

def run_algolia_scrape():
    client = SearchClient.create(APP_ID, API_KEY)
    
    # Potential index names
    indices_to_try = ["products-vzla", "products_vzla", "products-ve", "products", "prod_vzla"]
    
    for index_name in indices_to_try:
        print(f"\n⚡ Trying Index: {index_name} ...")
        index = client.init_index(index_name)
        
        try:
            # Search for a common product
            res = index.search("Acetaminofen", {
                'hitsPerPage': 5,
                'attributesToRetrieve': ['name', 'description', 'price', 'brand', 'stock', 'image', 'url']
            })
            
            if res['nbHits'] > 0:
                print(f"   ✅ SUCCESS! Found {res['nbHits']} hits.")
                print("   Samples:")
                for hit in res['hits']:
                    print(f"   - {hit.get('name')} | Price: {hit.get('price')} | Stock: {hit.get('stock')}")
                
                # Save sample
                with open(f'algolia_sample_{index_name}.json', 'w', encoding='utf-8') as f:
                    json.dump(res, f, ensure_ascii=False, indent=2)
                    
                return index_name
            else:
                print("   ⚠️ Index exists but returned 0 hits (might be wrong index content).")
                
        except Exception as e:
            print(f"   ❌ Failed: {e}")

    return None

if __name__ == "__main__":
    valid_index = run_algolia_scrape()
    if valid_index:
        print(f"\n🎉 Valid Index Identified: {valid_index}")
    else:
        print("\n❌ Could not identify a valid product index.")
