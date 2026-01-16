import json

with open('farmatodo_output/api_traffic.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    print("Keys in one call entry:", data['calls'][0].keys())
