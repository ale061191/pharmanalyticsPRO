import json

def run():
    try:
        with open('farmatodo_output/api_traffic.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Total entries: {len(data.get('calls', []))}")
        
        with open('urls_dump.txt', 'w', encoding='utf-8') as out:
            for entry in data.get('calls', []):
                out.write(entry.get('url', '') + '\n')
                
        print("✅ Dumped all URLs to urls_dump.txt")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
