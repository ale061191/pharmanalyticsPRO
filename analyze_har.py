
import json
import urllib.parse
import os

def analyze_har(har_path):
    with open(har_path, 'r', encoding='utf-8') as f:
        har_data = json.load(f)

    entries = har_data['log']['entries']
    print(f"Total requests captured: {len(entries)}")

    candidates = []

    for entry in entries:
        request = entry['request']
        response = entry['response']
        url = request['url']
        
        # Filter unrelated static assets to reduce noise
        if any(ext in url for ext in ['.css', '.js', '.png', '.jpg', '.woff', '.svg', 'google', 'facebook', 'sentry']):
            continue

        # Look for our key domains
    with open('har_analysis_results.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total requests captured: {len(entries)}\n\n")
        f.write("--- Start of Request Dump ---\n\n")
        
        for entry in entries:
            request = entry['request']
            response = entry['response']
            url = request['url']
            
            # Still filter static assets
            if any(ext in url for ext in ['.css', '.js', '.png', '.jpg', '.woff', '.svg', 'google', 'facebook', 'sentry']):
                continue
                
            f.write(f"URL: {url}\n")
            f.write(f"Method: {request['method']} | Status: {response['status']}\n")
            
            # Print full response if it's from farmatodo
            if 'farmatodo' in url:
                text = response['content'].get('text', '')
                f.write(f"Response Body: {text}\n")
            else:
                f.write(f"Response Body Snippet: {response['content'].get('text', '')[:200]}\n")
            
            f.write("-" * 80 + "\n")
    
    print("Detailed analysis complete. Results written to har_analysis_results.txt")

if __name__ == "__main__":
    if os.path.exists('farmatodo_stock.har'):
        analyze_har('farmatodo_stock.har')
    else:
        print("HAR file not found yet.")
