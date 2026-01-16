from playwright.sync_api import sync_playwright
import time
import json

PRODUCT_ID = "23645003297"
# URL = f"https://www.farmatodo.com.ve/producto/{PRODUCT_ID}"
URL = "https://www.farmatodo.com.ve/producto/23645003297"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print(f"Navigating to {URL}...")
        captured_data = []

        def handle_response(response):
            try:
                if "application/json" in response.headers.get("content-type", ""):
                    url = response.url
                    # Capture EVERYTHING json to be safe
                    if "api" in url or "algolia" in url:
                        # print(f"Captured JSON from: {url}")
                        try:
                            json_data = response.json()
                            captured_data.append({"url": url, "data": json_data})
                        except:
                            pass
            except:
                pass

        page.on("response", handle_response)

        try:
            # Use domcontentloaded for faster interaction
            page.goto(URL, timeout=60000, wait_until="domcontentloaded")
            print("Page DOM loaded.")
            print(f"Title: {page.title()}")

            # Wait a bit for JS hydration
            page.wait_for_timeout(5000)

            # Look for button
            print("Looking for 'disponibilidad' button...")
            try:
                # Try generic selector first
                button = page.locator("button", has_text="disponibilidad").first
                if not button.is_visible():
                     # Try finding ANY element with text 'Ver disponibilidad'
                     button = page.locator("text=Ver disponibilidad").first
                
                if button.is_visible():
                    print(f"Button found: {button.inner_text()}")
                    button.click()
                    print("Clicked button. Waiting for network...")
                    page.wait_for_timeout(8000) # Wait for network
                else:
                    print("Button NOT found.")
                    # List all buttons to see what's there
                    # buttons = page.locator("button").all_inner_texts()
                    # print(f"Available buttons: {buttons[:10]}")
            except Exception as e:
                print(f"Interaction error: {e}")

        except Exception as e:
            print(f"Top level error: {e}")
        finally:
            # Always dump content if we didn't find stock data
            with open("debug_page_dump.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            print("Dumped content to debug_page_dump.html")

        print(f"Captured {len(captured_data)} JSON responses.")
        
        # Analyze
        match_found = False
        for item in captured_data:
            s_data = json.dumps(item['data'])
            # Check for generic stock indicators
            if ("stock" in s_data.lower() or "availability" in s_data.lower()) and "146" in s_data:
                print("\n!!! POTENTIAL DATA !!!")
                print(f"URL: {item['url']}")
                print(s_data[:500])
                match_found = True
        
        if not match_found:
            print("No stock data matched.")

        browser.close()

if __name__ == "__main__":
    run()
