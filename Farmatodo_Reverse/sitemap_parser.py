import requests
import xml.etree.ElementTree as ET
import os

# Configuration
SITEMAP_URL = "https://www.farmatodo.com.ve/sitemap-products.xml"
OUTPUT_DIR = "extracted_data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "product_urls.txt")

def parse_sitemap():
    print(f"📥 Downloading sitemap from {SITEMAP_URL}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(SITEMAP_URL, headers=headers)
        response.raise_for_status()
        
        print("✅ Sitemap downloaded. Parsing XML...")
        
        # Parse XML
        # Handle namespaces effectively
        root = ET.fromstring(response.content)
        
        # Define namespace map (sitemaps usually use this)
        namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        urls = []
        for url in root.findall('ns:url', namespaces):
            loc = url.find('ns:loc', namespaces).text
            if loc:
                urls.append(loc)
        
        # Save to file
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            for u in urls:
                f.write(u + "\n")
                
        print(f"🎉 Success! Extracted {len(urls)} product URLs.")
        print(f"📁 Saved to: {OUTPUT_FILE}")
        
        # Show first 5 examples
        print("\n👀 First 5 URLs:")
        for u in urls[:5]:
            print(f" - {u}")

    except Exception as e:
        print(f"❌ Error occurred: {e}")

if __name__ == "__main__":
    parse_sitemap()
