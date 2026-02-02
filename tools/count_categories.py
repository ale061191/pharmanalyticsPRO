
import unicodedata

def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def main():
    filepath = "c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_farmacologicos.txt"
    
    categories = {
        "Suministros Médicos": {
            "Lentes (General)": ["lentes"],
            "Guantes": ["guante"],
            "Fajas": ["faja"],
            "Tapa Bocas": ["tapa boca", "mascarilla", "tapaboca"]
        },
        "Alimentos": {
            "Chocolate": ["chocolate"],
            "Galletas": ["galleta"],
            "Harina": ["harina"],
            "Pistacho": ["pistacho"]
        }
    }
    
    counts = {cat: {kw: 0 for kw in keywords} for cat, keywords in categories.items()}
    
    # Also track total for each super category
    cat_totals = {cat: 0 for cat in categories}

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            original = line.strip()
            if not original: continue
            normalized = remove_accents(original.lower())
            
            for cat, subcategories in categories.items():
                found_in_category = False
                for subcat, keywords in subcategories.items():
                    if any(k in normalized for k in keywords):
                        counts[cat][subcat] += 1
                        found_in_category = True
                
                if found_in_category:
                    cat_totals[cat] += 1

    print("-" * 30)
    print("REPORTE DE CATEGORÍAS ENCONTRADAS")
    print("-" * 30)
    
    for cat, subcats in counts.items():
        print(f"\nCATEGORY: {cat} (Total Unique Lines: {cat_totals[cat]})")
        for subcat, count in subcats.items():
            print(f"  - {subcat}: {count}")

if __name__ == "__main__":
    main()
