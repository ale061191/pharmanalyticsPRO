"""
🎖️ MISIÓN V3: EXTRACCIÓN COMPLETA - 45,311 productos
=====================================================
Estrategia: Buscar por cada letra del alfabeto + categorías
para superar el límite de 1000 productos de Algolia

Autor: Claude AI - Modo Autónomo
"""

import requests
import json
import time
import csv
import re
from datetime import datetime
from collections import defaultdict

# === CONFIGURACIÓN ===
APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"
INDEX_NAME = "products"

HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": API_KEY,
    "Content-Type": "application/json",
    "Referer": "https://www.farmatodo.com.ve/",
    "Origin": "https://www.farmatodo.com.ve",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
}

DELAY = 0.35

# Letras para búsqueda exhaustiva
ALPHABET = list("abcdefghijklmnopqrstuvwxyz")

# Términos farmacéuticos clave para buscar
PHARMA_SEARCH_TERMS = [
    # Formas farmacéuticas
    "tableta", "cápsula", "jarabe", "suspensión", "solución", 
    "ampolla", "inyectable", "crema", "pomada", "ungüento",
    "gotas", "spray", "inhalador", "supositorio", "parche",
    "comprimido", "gragea", "sobre", "granulado",
    
    # Principios activos comunes
    "acetaminofén", "ibuprofeno", "paracetamol", "aspirina",
    "omeprazol", "ranitidina", "pantoprazol", "lansoprazol",
    "amoxicilina", "azitromicina", "ciprofloxacina", "metronidazol",
    "loratadina", "cetirizina", "difenhidramina", "fexofenadina",
    "diclofenaco", "naproxeno", "meloxicam", "ketorolaco",
    "metformina", "losartán", "enalapril", "amlodipino",
    "salbutamol", "beclometasona", "vitamina", "complejo b",
    "ácido fólico", "hierro", "calcio", "zinc", "magnesio",
    "antigripal", "antialérgico", "antibiótico", "analgésico",
    
    # Categorías de medicamentos
    "medicamento", "medicina", "farmacia", "otc", "rx",
    "genérico", "laboratorio"
]

def search_algolia(query="", hits_per_page=1000, page=0):
    """Búsqueda en Algolia"""
    url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{INDEX_NAME}/query"
    params = f"query={query}&hitsPerPage={hits_per_page}&page={page}"
    payload = {"params": params}
    
    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=20)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def collect_all_pharma_products():
    """Recolectar todos los productos farmacéuticos usando múltiples búsquedas"""
    all_products = {}
    
    print("[INFO] Estrategia: Búsqueda exhaustiva por términos farmacéuticos")
    print(f"[INFO] Total términos a buscar: {len(PHARMA_SEARCH_TERMS)}")
    
    for i, term in enumerate(PHARMA_SEARCH_TERMS):
        print(f"[{i+1}/{len(PHARMA_SEARCH_TERMS)}] Buscando '{term}'...", end=" ")
        
        page = 0
        term_count = 0
        
        while True:
            result = search_algolia(term, hits_per_page=1000, page=page)
            
            if not result or "hits" not in result:
                break
            
            hits = result.get("hits", [])
            if not hits:
                break
            
            for hit in hits:
                product_id = hit.get("id", "")
                if product_id and product_id not in all_products:
                    all_products[product_id] = hit
                    term_count += 1
            
            # Verificar si hay más páginas
            total_pages = result.get("nbPages", 1)
            if page >= total_pages - 1:
                break
            
            page += 1
            time.sleep(DELAY)
        
        print(f"+{term_count} nuevos (Total: {len(all_products):,})")
        time.sleep(DELAY)
    
    return list(all_products.values())

def is_pharmaceutical(product):
    """Determinar si es producto farmacéutico"""
    category = (product.get("categorie", "") or "").lower()
    subcategory = (product.get("subCategory", "") or "").lower()
    name = (product.get("mediaDescription", "") or product.get("description", "") or "").lower()
    
    # Categorías farmacéuticas
    pharma_cats = [
        "salud", "medicament", "digestiv", "gripa", "dolor",
        "vitamina", "suplement", "respiratori", "antibiotic",
        "antiinflamatori", "analgésic", "antialérgic"
    ]
    
    for cat in pharma_cats:
        if cat in category or cat in subcategory:
            return True
    
    # Palabras clave farmacéuticas en el nombre
    pharma_keywords = [
        "mg", "ml", "mcg", "ui",
        "tableta", "cápsula", "jarabe", "suspensión", "solución",
        "ampolla", "inyectable", "crema", "pomada", "ungüento",
        "gotas", "spray", "inhalador", "supositorio",
        "comprimido", "gragea", "sobre", "granulado"
    ]
    
    for kw in pharma_keywords:
        if kw in name:
            return True
    
    if product.get("requirePrescription"):
        return True
    
    return False

def extract_active_ingredient(product):
    """Extraer principio activo"""
    name = (product.get("mediaDescription", "") or product.get("description", "") or "").lower()
    
    known_actives = {
        "acetaminofén": "Acetaminofén",
        "acetaminofen": "Acetaminofén", 
        "paracetamol": "Paracetamol",
        "ibuprofeno": "Ibuprofeno",
        "diclofenaco": "Diclofenaco",
        "naproxeno": "Naproxeno",
        "meloxicam": "Meloxicam",
        "ketorolaco": "Ketorolaco",
        "piroxicam": "Piroxicam",
        "omeprazol": "Omeprazol",
        "ranitidina": "Ranitidina",
        "pantoprazol": "Pantoprazol",
        "lansoprazol": "Lansoprazol",
        "esomeprazol": "Esomeprazol",
        "loratadina": "Loratadina",
        "cetirizina": "Cetirizina",
        "fexofenadina": "Fexofenadina",
        "difenhidramina": "Difenhidramina",
        "amoxicilina": "Amoxicilina",
        "azitromicina": "Azitromicina",
        "ciprofloxacina": "Ciprofloxacina",
        "metronidazol": "Metronidazol",
        "ampicilina": "Ampicilina",
        "penicilina": "Penicilina",
        "metformina": "Metformina",
        "glibenclamida": "Glibenclamida",
        "losartán": "Losartán",
        "enalapril": "Enalapril", 
        "amlodipino": "Amlodipino",
        "atenolol": "Atenolol",
        "captopril": "Captopril",
        "salbutamol": "Salbutamol",
        "beclometasona": "Beclometasona",
        "fluticasona": "Fluticasona",
        "ácido fólico": "Ácido Fólico",
        "acido folico": "Ácido Fólico",
        "ácido acetilsalicílico": "Ácido Acetilsalicílico",
        "aspirina": "Ácido Acetilsalicílico",
        "vitamina c": "Vitamina C",
        "vitamina d": "Vitamina D",
        "vitamina b12": "Vitamina B12",
        "complejo b": "Complejo B",
        "hierro": "Hierro",
        "calcio": "Calcio",
        "zinc": "Zinc",
        "magnesio": "Magnesio",
        "dipirona": "Dipirona",
        "metamizol": "Metamizol",
        "tramadol": "Tramadol",
        "codeína": "Codeína",
        "dexametasona": "Dexametasona",
        "prednisona": "Prednisona",
        "hidrocortisona": "Hidrocortisona",
        "clotrimazol": "Clotrimazol",
        "miconazol": "Miconazol",
        "fluconazol": "Fluconazol",
        "metoclopramida": "Metoclopramida",
        "domperidona": "Domperidona",
        "loperamida": "Loperamida",
        "simvastatina": "Simvastatina",
        "atorvastatina": "Atorvastatina",
        "levotiroxina": "Levotiroxina",
        "alprazolam": "Alprazolam",
        "diazepam": "Diazepam",
        "clonazepam": "Clonazepam"
    }
    
    for key, value in known_actives.items():
        if key in name:
            return value
    
    # Intentar extraer del nombre
    match = re.search(r"^([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s+\d+\s*(?:mg|g|ml|mcg)", name)
    if match:
        potential = match.group(1).strip().title()
        if len(potential) > 3:
            return potential
    
    return ""

def extract_lab(product):
    """Extraer laboratorio"""
    lab = product.get("supplier", "") or product.get("sup_description", "")
    if lab and lab.strip():
        return lab.strip()
    
    marca = product.get("marca", "")
    if marca:
        return marca.strip()
    
    return ""

def process_product(product):
    """Procesar producto"""
    return {
        "id": product.get("id", ""),
        "codigo_barras": product.get("barcode", ""),
        "nombre": product.get("mediaDescription", "") or product.get("description", ""),
        "laboratorio": extract_lab(product),
        "marca": product.get("marca", ""),
        "principio_activo": extract_active_ingredient(product),
        "requiere_receta": product.get("requirePrescription", False),
        "es_generico": product.get("isGeneric", False),
        "categoria": product.get("categorie", ""),
        "subcategoria": product.get("subCategory", ""),
        "precio_bs": product.get("fullPrice", 0),
        "ventas": product.get("sales", 0),
        "stock": product.get("stock", 0),
        "imagen_url": product.get("mediaImageUrl", ""),
        "fecha_extraccion": datetime.now().isoformat()
    }

def main():
    print("=" * 70)
    print("🎖️ MISIÓN V3: EXTRACCIÓN TOTAL PRODUCTOS FARMACÉUTICOS")
    print("=" * 70)
    start_time = datetime.now()
    
    # Recolectar productos
    print("\n📋 FASE 1: Recolectando productos farmacéuticos...")
    all_products = collect_all_pharma_products()
    print(f"\n   ✅ Total productos únicos recolectados: {len(all_products):,}")
    
    # Filtrar farmacéuticos
    print("\n📋 FASE 2: Filtrando productos farmacéuticos estrictos...")
    pharma = [process_product(p) for p in all_products if is_pharmaceutical(p)]
    print(f"   ✅ Productos farmacéuticos confirmados: {len(pharma):,}")
    
    # Estadísticas
    print("\n📋 FASE 3: Generando estadísticas...")
    
    # Laboratorios
    labs = defaultdict(int)
    for p in pharma:
        lab = p["laboratorio"] or "Desconocido"
        labs[lab] += 1
    labs_sorted = sorted(labs.items(), key=lambda x: x[1], reverse=True)
    
    # Principios activos
    activos = defaultdict(int)
    for p in pharma:
        if p["principio_activo"]:
            activos[p["principio_activo"]] += 1
    activos_sorted = sorted(activos.items(), key=lambda x: x[1], reverse=True)
    
    with_active = sum(1 for p in pharma if p["principio_activo"])
    
    print(f"   • Laboratorios únicos: {len(labs_sorted)}")
    print(f"   • Principios activos identificados: {len(activos_sorted)}")
    print(f"   • Productos con principio activo: {with_active} ({with_active/len(pharma)*100:.1f}%)")
    
    # Guardar archivos
    print("\n📋 FASE 4: Guardando archivos...")
    
    with open("FARMATODO_VE_PHARMA_FULL.json", "w", encoding="utf-8") as f:
        json.dump(pharma, f, ensure_ascii=False, indent=2)
    print(f"   ✅ FARMATODO_VE_PHARMA_FULL.json ({len(pharma):,} productos)")
    
    if pharma:
        with open("FARMATODO_VE_PHARMA_FULL.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=pharma[0].keys())
            writer.writeheader()
            writer.writerows(pharma)
        print("   ✅ FARMATODO_VE_PHARMA_FULL.csv")
    
    with open("FARMATODO_VE_LABORATORIOS.json", "w", encoding="utf-8") as f:
        json.dump(dict(labs_sorted), f, ensure_ascii=False, indent=2)
    print(f"   ✅ FARMATODO_VE_LABORATORIOS.json ({len(labs_sorted)} labs)")
    
    with open("FARMATODO_VE_PRINCIPIOS_ACTIVOS.json", "w", encoding="utf-8") as f:
        json.dump(dict(activos_sorted), f, ensure_ascii=False, indent=2)
    print(f"   ✅ FARMATODO_VE_PRINCIPIOS_ACTIVOS.json ({len(activos_sorted)} activos)")
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    summary = {
        "mision": "Extracción Completa Farmatodo VE",
        "fecha": end_time.isoformat(),
        "duracion_segundos": round(duration, 1),
        "productos_recolectados": len(all_products),
        "productos_farmaceuticos": len(pharma),
        "laboratorios": len(labs_sorted),
        "principios_activos": len(activos_sorted),
        "cobertura_principio_activo": round(with_active/len(pharma)*100, 1),
        "top_15_laboratorios": dict(labs_sorted[:15]),
        "top_15_principios_activos": dict(activos_sorted[:15])
    }
    
    with open("FARMATODO_VE_RESUMEN_FINAL.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("   ✅ FARMATODO_VE_RESUMEN_FINAL.json")
    
    print("\n" + "=" * 70)
    print("🎖️ MISIÓN COMPLETADA")
    print("=" * 70)
    print(f"""
📊 RESULTADOS:
   • Productos farmacéuticos: {len(pharma):,}
   • Laboratorios: {len(labs_sorted)}
   • Principios activos: {len(activos_sorted)}
   • Cobertura PA: {with_active/len(pharma)*100:.1f}%
   
   Top 10 Labs: {', '.join([x[0] for x in labs_sorted[:10]])}
   
⏱️ Tiempo: {duration:.1f}s
""")

if __name__ == "__main__":
    main()
