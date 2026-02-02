
from collections import Counter
import re

def main():
    filepath = "c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_con_laboratorios.txt"
    stopwords = {"mg", "ml", "gr", "g", "kg", "ui", "mcg", "x", "y", "de", "en", "con", "sin", "para", "el", "la", "los", "las", "unid", "unidad", "unidades", "capsulas", "tabletas", "comprimidos", "ampollas", "sobre", "sobres", "frasco", "tubo", "crema", "gel", "solucion", "jarabe", "polvo", "lata", "barra", "adulto", "pediatrico", "infantil", "dia", "noche", "forte", "plus", "ultra", "max", "pro", "talla", "s", "m", "l", "xl", "30", "10", "20", "60", "100", "500", "1000", "2.5", "5", "1", "120", "15", "0.5", "0.1", "0", "1%", "2%", "5%", "10%", "a", "b", "c", "d", "e", "f", "h", "k", "z", "no", "si", "pack", "set", "kit", "und", "cm", "mm", "mt", "mts", "unknown"}

    unknown_lines = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            if "|" in line:
                parts = line.strip().split("|")
                if len(parts) >= 2 and parts[-1] == "Unknown":
                    # Check if line is literally "Unknown|Unknown"
                    if parts[0].strip().lower() != "unknown":
                        unknown_lines.append(parts[0])

    word_counter = Counter()
    
    for line in unknown_lines:
        # Simple tokenization
        words = re.findall(r'\b[a-zA-Z]{3,}\b', line.lower())
        for w in words:
            if w not in stopwords and not w.isdigit():
                word_counter[w] += 1

    print(f"Total Unknown (meaningful) lines: {len(unknown_lines)}")
    print("Top 50 Frequent Terms in Unknown lines:")
    for word, count in word_counter.most_common(50):
        print(f"{word}: {count}")

if __name__ == "__main__":
    main()
