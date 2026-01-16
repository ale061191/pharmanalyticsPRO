
with open(r"c:\Users\Usuario\Documents\pharmanalytics\debug_page_dump.html", "r", encoding="utf-8") as f:
    content = f.read()

print(f"File size: {len(content)}")

search_terms = ["70289139", "Solucion Fisiologica", "stock", "inventory"]

for term in search_terms:
    idx = content.find(term)
    if idx != -1:
        print(f"Found '{term}' at index {idx}")
        start = max(0, idx - 100)
        end = min(len(content), idx + 100)
        print(f"Context: ...{content[start:end]}...")
    else:
        print(f"'{term}' not found")
