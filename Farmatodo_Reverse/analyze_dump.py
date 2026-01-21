from bs4 import BeautifulSoup
import json
import sys

def analyze():
    try:
        with open("product_dump.html", "r", encoding="utf-8") as f:
            html = f.read()
        
        soup = BeautifulSoup(html, "html.parser")
        script = soup.find("script", {"id": "app-root-state"})
        
        if not script:
            print("No app-root-state script found.")
            return

        # usage of unescape might be needed if html entities are present, 
        # but usually script content is text. 
        # The view_file output showed &q; instead of ". Let's fix that.
        json_text = script.string
        if not json_text:
            print("Script has no text.")
            return
            
        # The dump shows &q; for quotes and &a; for ampersand. 
        # Standard unescape might not handle these non-standard entities if they aren't standard.
        # Let's do manual replacement.
        json_text = json_text.replace("&q;", '"').replace("&a;", "&")
        
        # content often contains unescaped newlines inside strings 
        # (e.g. descriptions spanning lines in the HTML source).
        # We need to escape them for valid JSON.
        json_text = json_text.replace('\n', '\\n').replace('\r', '')
        
        try:
            data = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            # Try to print a snippet to see what's wrong
            print(f"Snippet: {json_text[:200]}")
            return

        print("Keys in app-root-state:")
        for key in data.keys():
            print(f"- {key[:100]}...") # Truncate long keys (some are URLs)

        # detailed search
        print("\n--- Searching for Product Data ---")
        
        # Look for keys that resemble product detail endpoints
        product_keys = [k for k in data.keys() if "product" in k.lower() or "detalles" in k.lower()]
        for pk in product_keys:
            print(f"\nPotential Key: {pk}")
            val = data[pk]
            print(f"Type: {type(val)}")
            if isinstance(val, dict):
                print(f"Sub-keys: {list(val.keys())}")
                # Check for price inside
                if "price" in str(val).lower() or "precio" in str(val).lower():
                    print("  -> Contains 'price'/'precio' keyword")
                if "stock" in str(val).lower() or "existencia" in str(val).lower():
                    print("  -> Contains 'stock'/'existencia' keyword")

        # Check for specific fields requested
        print("\n--- Deep Search for 'ATC' and 'Stock' ---")
        found_atc = False
        found_stock = False
        
        str_data = str(data)
        if "BFS" in str_data: # invima/atc often BFS
             print("Found 'BFS' (possible ATC/Invima related)")
        if "ATC" in str_data:
             print("Found 'ATC'")
        if "stock" in str_data.lower():
             print("Found 'stock'")
        
        # Save parsed data for inspection
        with open("parsed_state.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("\nSaved parsed state to parsed_state.json")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze()
