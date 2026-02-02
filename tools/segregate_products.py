
import unicodedata
import os

def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def main():
    input_path = "c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_con_laboratorios.txt"
    output_clean = "c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_farmaceuticos_limpios.txt"
    output_excluded = "c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_no_farmacos.txt"
    
    # Keywords to exclude
    exclude_keywords = [
        "lentes", "guante", "faja", "tapa boca", "mascarilla", "tapaboca",
        "chocolate", "galleta", "harina", "pistacho"
    ]
    
    kept_lines = []
    excluded_lines = []
    
    # Read original file
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            original = line.strip()
            if not original: continue
            
            # Use the product name part for checking (before the pipe if it exists)
            # The previous script created "Name|Lab", but checking the whole line is safer 
            # to catch keywords everywhere, though Name is usually first.
            normalized = remove_accents(original.lower())
            
            is_excluded = False
            for kw in exclude_keywords:
                # Basic string matching
                if kw in normalized:
                    is_excluded = True
                    break
            
            if is_excluded:
                excluded_lines.append(original)
            else:
                kept_lines.append(original)
                
    # Write Clean File
    with open(output_clean, "w", encoding="utf-8") as f:
        f.write("\n".join(kept_lines))
        
    # Write Excluded File
    with open(output_excluded, "w", encoding="utf-8") as f:
        f.write(f"--- REPORTE DE PRODUCTOS EXCLUIDOS ({len(excluded_lines)}) ---\n")
        f.write("Categorias: Lentes, Guantes, Fajas, Mascarillas, Alimentos\n\n")
        f.write("\n".join(excluded_lines))
        
    print(f"Total processed: {len(kept_lines) + len(excluded_lines)}")
    print(f"Kept (Pharma): {len(kept_lines)}")
    print(f"Excluded (Supplies/Food): {len(excluded_lines)}")

if __name__ == "__main__":
    main()
