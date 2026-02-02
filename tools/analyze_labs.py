
import re

LABORATORIES = {
    "Farmatodo": ["farmatodo"],
    "Calox": ["calox"],
    "Leti": ["leti", "genven"], # User listed Genven as separate but also "Marca de Leti". Let's track them separately if possible, or map to Leti if requested. User said "4. Genven" is a lab. So I will keep Genven as Genven for now.
    "Genven": ["genven"], 
    "La Santé": ["la sante", "lasante", "pharmetique"], # La Sante is now Pharmetique, but user listed both 5 and 6. I'll check strict matches first.
    "Pharmetique Labs": ["pharmetique", "pharmetique labs"],
    "Vargas": ["vargas", "laboratorios vargas"],
    "Behrens": ["behrens"],
    "Elmor": ["elmor"],
    "Vincenti": ["vincenti"],
    "Meyer": ["meyer"],
    "Megalabs": ["megalabs"],
    "Roemmers": ["roemmers"],
    "Siegfried": ["siegfried"],
    "Cofasa": ["cofasa"],
    "Aless Pharmaceuticals": ["aless", "aless pharmaceuticals"],
    "FC Pharma": ["fc pharma", "f.c. pharma", "fcpharma"],
    "Bayer": ["bayer"],
    "Sanofi": ["sanofi"],
    "Novartis": ["novartis"],
    "Merck": ["merck"],
    "Himalaya": ["himalaya"],
    "Sigvaris": ["sigvaris"],
    "Enterex": ["enterex"],
    "Pediasure": ["pediasure"],
    "Ensure": ["ensure"],
    "3M": ["3m"],
    "Schar": ["schar"],
    "Gullon": ["gullon"],
    "Now": ["now"],
    "Procaps": ["procaps"],
    "Galderma": ["galderma"],
    "Oftalmi": ["oftalmi"],
    "Rowe": ["rowe"],
    "Polinac": ["polinac"],
}

# Explicit priority for "Genven" being separate but related.
# If "Genven" appears, it matches Genven.
# If "Leti" appears, it matches Leti.

def normalize(text):
    return text.lower().strip()

def match_lab(product_name):
    product_lower = normalize(product_name)
    
    # Custom fixes/Known Associations (from reading the file)
    if "dixson" in product_lower: return "Dixson (Unlisted)" # Not in 35 list
    if "nordic vision" in product_lower: return "Nordic Vision (Unlisted)"
    if "k6" in product_lower: return "K6 (Unlisted)"
    if "unknown" in product_lower: return "Unknown"
    
    found_labs = []
    
    for lab, keywords in LABORATORIES.items():
        for kw in keywords:
            # Word boundary check is better but simple 'in' is a start
            # Use regex for word boundary to avoid partial matches inside other words if necessary
            # For now simple substring is likely fine for these distinct names
            if kw in product_lower:
                found_labs.append(lab)
                break
    
    if not found_labs:
        return None
    
    # Priority handling
    if "Genven" in found_labs and "Leti" in found_labs:
        return "Genven" # Specificity? Or Leti? Let's say Genven if explicit.
        
    return found_labs[0] # Return first match

def main():
    filepath = "c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_farmacologicos.txt"
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    import unicodedata
    def remove_accents(input_str):
        nfkd_form = unicodedata.normalize('NFKD', input_str)
        return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

    # Combined map of Lab Name -> [Keywords]
    # Includes user's 35 + Discovered
    LAB_KEYWORDS = {
        # User's 35 Verified
        "Farmatodo": ["farmatodo"],
        "Calox": ["calox"],
        "Leti": ["leti", "genven", "alivet"], # Genven is Leti brand contextually
        "La Santé": ["la sante", "lasante", "pharmetique"], # Pharmetique owns/is La Sante
        "Vargas": ["vargas", "laboratorios vargas", "biprolil"],
        "Behrens": ["behrens"],
        "Elmor": ["elmor", "tantum", "alantamida"],
        "Vincenti": ["vincenti"],
        "Meyer": ["meyer"], # Noxpirin moved to Siegfried
    "Megalabs": ["megalabs", "corentel", "eukene", "bresis", "dolcan", "grausin", "accualaxan", "angrip"], # Angrip is Megalabs
    "Roemmers": ["roemmers"],
    "Siegfried": ["siegfried", "imazol", "cetral", "multiviral", "pasolax", "tiroxin", "noxpirin"], # Noxpirin is Siegfried
    "Cofasa": ["cofasa", "lagricof"],
    "Aless Pharm": ["aless", "xanextra"],
    "FC Pharma": ["fc pharma", "f.c. pharma", "fcpharma"],
    "Bayer": ["bayer", "yaz"],
    "Sanofi": ["sanofi"],
    "Novartis": ["novartis"],
    "Merck": ["merck", "eutirox"],
    "Himalaya": ["himalaya", "kilose"],
    "Sigvaris": ["sigvaris"],
    "Enterex": ["enterex"],
    "Pediasure": ["pediasure"],
    "Ensure": ["ensure"],
    "3M": ["3m"],
    "Schar": ["schar"],
    "Gullon": ["gullon"],
    "Now": ["now", "probiotic-10"],
    "Procaps": ["procaps", "deferol"], # Deferol is Procaps
    "Galderma": ["galderma", "benzac"],
    "Oftalmi": ["oftalmi", "flinas", "deslorat"],
    "Rowe": ["rowe", "nefrotal", "tridetarmon", "zolpidex"],
    "Polinac": ["polinac", "madecassol"],
    
    # Discovered / Extras
    "Farma": ["laboratorios farma", "bonames", "tonervol", "magalex", "teragrip"], # Teragrip is Farma
    "Valmor": ["valmor", "rivaprof", "cander"],
    "Tiares": ["tiares", "celestrel", "dani", "itrasec", "estrasyn"],
    "Ronava": ["ronava", "folifer"],
    "Plusandex": ["plusandex", "diclodex"],
    "Genfar": ["genfar"],
    "FAHD": ["fahd"],
    "Natural Systems": ["natural systems", "natural system", "omega 3 natural system"],
    "Naturlife": ["naturlife", "naturlife's", "naturlifes", "venirex"],
    "Vivax": ["vivax", "betaduo", "selene"],
    "Biotech": ["biotech", "beproderm", "eki cal", "carbatil"],
    "Dollder": ["dollder", "heprox", "dolak", "dompesin"],
    "Klinos": ["klinos", "prosolvit"], # Angrip moved to Megalabs
    "Blue Medical": ["blu", "blue medical", "blue med"],
    "GreenPharma": ["greenpharma", "niclodi"],
    "JHC": ["jhc"],
    "Mallen": ["mallen", "neumocort"],
    "Jerico": ["jerico", "venasplant", "prostalife"],
    "Zuzu": ["zuzu"],
    "Portugal": ["portugal", "betapluss"],
    "Intervit": ["intervit"],
    "Zuoz": ["zuoz"],
    "Laproff": ["laproff"],
    "Quim-Far": ["quim-far", "quimfar"],
    "Corpus": ["corpus"],
    "Herbaplant": ["herbaplant", "beusan"],
    "Neopharma": ["neopharma", "methoget"],
    "SNC Pharma": ["snc pharma", "dozher"],
    "GVR": ["representaciones gvr"],
    "Politecnicos": ["laboratorio politecnicos", "novakosid"],
    "Global Farma": ["global farma"],
    "SM Pharma": ["sm pharma"],
    "Kimiceg": ["kimiceg"],
    "Biohlab": ["biohlab"],
    "Beval": ["beval"],
    "Drofarvica": ["drofarvica", "calciden"],
    "Calbos": ["calbos"],
    "Elter": ["elter"],
    "Reveex": ["reveex"],
    "Vensalud": ["vensalud"],
    "Risquez": ["risquez"],
    "Ceron": ["ceron"],
    "Inhrr": ["inhrr"],
    "Servitalento": ["servitalento"],
    "Pharmatech": ["pharmatech", "centab"],
    "Arte Medico": ["arte médico", "arte medico", "inmunogum"],
    "Altian": ["altian", "acicran"],
    "Deva": ["deva"],
    "Europharm": ["europharm", "eurofarm"],
    "Dixson": ["dixson"],
    "K6": ["k6"],
    "Nordic Vision": ["nordic vision"],
    "SPL": ["spl"],
    "Gotland": ["gotland"],
    "Sunny Trading": ["sunny trading"],
    "Grossmed": ["grossmed"],
    "CureBand": ["cureband"],
    "Procare": ["procare"],
    "Barilla": ["barilla"],
    "Nestle": ["nestle"],
    "Kelloggs": ["kellogg's", "kelloggs"],
    "Alfonzo Rivas": ["alfonzo rivas"],
    "Mary": ["mary"],
    "Pan" : ["pan"],
    "Genia Care": ["genia care", "flixocare"],
    "Arcoiris": ["arcoiris", "arco iris"],
    "Val": ["val "], 
    "Going": ["going"],
    "Nutragum": ["nutragum"],
    "Nutritek": ["nutritek"],
    "Ebben": ["ebben"],
    "Colmed": ["colmed"],
    "Remeny": ["remeny"],
    "Pharmacorp": ["pharmacorp"],
    "Spervend": ["spervend"],
    "Maja": ["maja"],
    "Samson": ["samson"],
    "Huazhong": ["huazhong"],
    "Angelus": ["angelus"],
    "La Piel": ["la piel"],
    "St Moritz": ["st moritz", "st. moritz"],
    "Zisnella": ["zisnella"],
    "Sweetest": ["sweetest"],
    "Ricola": ["ricola"],
    "Vick": ["vick"],
    "Neilmed": ["neilmed"],
    "Ana Maria Lajusticia": ["ana maria lajusticia"],
    "Ursocol": ["ursocol"],
    "ASK": ["ask", "ask laboratorios"],
    "Optiko": ["optiko"],
    "VPD": ["vpd"],
    "Balker": ["balker"],
    }

    results = {}
    output_lines = []
    
    unknown_count = 0
    
    for line in lines:
        original = line.strip()
        if not original: continue
        
        normalized_line = remove_accents(original.lower())
        detected_lab = "Unknown"
        
        # Priority Match
        best_match = None
        max_len = 0
        
        for lab, keywords in LAB_KEYWORDS.items():
            for kw in keywords:
                # Check for word boundary or specific inclusion
                # To avoid 'val' in 'valsartan', we checked 'val ' above.
                if kw in normalized_line:
                    # Heuristic: Prefer longer matches (Laboratorios Farma > Farma)
                    if len(kw) > max_len:
                        max_len = len(kw)
                        best_match = lab
        
        if best_match:
            detected_lab = best_match
        else:
            # Fallback patterns
            # Check for Vitafer -> Calox
            if "vitafer" in normalized_line: detected_lab = "Calox"
            elif "fludil" in normalized_line: detected_lab = "Pharmetique Labs"
            elif "solunovar" in normalized_line: detected_lab = "La Santé"
            elif "benzodiazol" in normalized_line: detected_lab = "La Santé"
        
        if detected_lab == "Unknown":
            unknown_count += 1
        else:
            if detected_lab not in results: results[detected_lab] = 0
            results[detected_lab] += 1
            
        output_lines.append(f"{original}|{detected_lab}")

    # Write Report
    with open("c:\\Users\\Usuario\\Documents\\pharmanalytics\\lab_analysis_final.txt", "w", encoding="utf-8") as out:
        out.write(f"Total Lines: {len(lines)}\n")
        out.write(f"Classified: {len(lines) - unknown_count}\n")
        out.write(f"Unknown: {unknown_count}\n")
        out.write("-" * 20 + "\n")
        out.write("LAB STATS:\n")
        for lab, count in sorted(results.items(), key=lambda item: item[1], reverse=True):
            out.write(f"{lab}: {count}\n")
            
    # Write Cleaned File
    with open("c:\\Users\\Usuario\\Documents\\pharmanalytics\\productos_con_laboratorios.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))

if __name__ == "__main__":
    main()
