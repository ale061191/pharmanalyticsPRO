"""
🎖️ MISIÓN: Extracción Completa de Productos Farmacológicos de Venezuela
========================================================================
Objetivo: 100% de productos farmacéuticos con:
- Nombre del producto
- Laboratorio/Marca
- Código ATC
- Principio Activo
- Stock y Ventas

Autor: Claude AI - Modo Autónomo
Fecha: 2026-01-20
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

# Posibles índices a probar
INDICES_TO_TRY = [
    "products",           # El que ya funciona
    "products-venezuela",
    "productos-venezuela", 
    "products_venezuela",
    "productos_vzla",
    "products-vzla",
    "items_seo_vzla",
]

HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": API_KEY,
    "Content-Type": "application/json",
    "Referer": "https://www.farmatodo.com.ve/",
    "Origin": "https://www.farmatodo.com.ve",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
}

# Categorías farmacéuticas a buscar
PHARMA_CATEGORIES = [
    "Salud y medicamentos",
    "Salud digestiva",
    "Tratamiento de la gripa",
    "Dolor y fiebre",
    "Vitaminas y suplementos",
    "Cuidado de la piel",
    "Salud sexual",
    "Sistema respiratorio",
    "Antiinflamatorios",
    "Antibióticos",
    "Medicamentos",
]

# Rate limiting
DELAY = 0.3  # 300ms entre requests

def search_algolia(index_name, query="", hits_per_page=1000, page=0, filters=""):
    """Búsqueda en Algolia con paginación"""
    url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{index_name}/query"
    
    params = f"query={query}&hitsPerPage={hits_per_page}&page={page}"
    if filters:
        params += f"&filters={filters}"
    
    payload = {"params": params}
    
    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=15)
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except Exception as e:
        print(f"[ERROR] {e}")
        return None

def browse_all_products(index_name, filters=""):
    """Obtener TODOS los productos usando browse/paginación"""
    all_products = []
    page = 0
    total_pages = 1
    
    while page < total_pages:
        print(f"[INFO] Fetching page {page + 1}...", end=" ")
        
        result = search_algolia(index_name, "", hits_per_page=1000, page=page, filters=filters)
        
        if not result or "hits" not in result:
            print("ERROR")
            break
        
        hits = result["hits"]
        total_pages = result.get("nbPages", 1)
        total_hits = result.get("nbHits", 0)
        
        print(f"Got {len(hits)} products (Total: {total_hits})")
        
        all_products.extend(hits)
        page += 1
        time.sleep(DELAY)
    
    return all_products

def extract_active_ingredient(product):
    """Extraer principio activo del producto"""
    # Campos donde puede estar el principio activo
    sources = [
        product.get("large_description", ""),
        product.get("largeDescription", ""),
        product.get("detailDescription", ""),
        product.get("description", ""),
        product.get("mediaDescription", ""),
    ]
    
    for source in sources:
        if not source:
            continue
        
        source_lower = source.lower()
        
        # Patrones comunes para principio activo
        patterns = [
            r"principio activo[:\s]+([^\n\r,]+)",
            r"contiene[:\s]+([^\n\r,]+)",
            r"composición[:\s]+([^\n\r,]+)",
            r"^([a-záéíóú]+(?:\s+[a-záéíóú]+)?)\s+\d+\s*(?:mg|g|ml|mcg)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, source_lower, re.IGNORECASE)
            if match:
                return match.group(1).strip().title()
    
    # Intentar extraer del nombre
    name = product.get("mediaDescription", "") or product.get("description", "")
    if name:
        # Patrón: "Principio Activo MARCA dosis"
        parts = name.split()
        if len(parts) >= 2:
            # Primer o segundo palabra suele ser el principio activo
            potential = parts[0]
            if potential.lower() not in ["crema", "gel", "jarabe", "tabletas", "cápsulas", "solución"]:
                return potential
    
    return ""

def extract_atc_code(product):
    """Extraer código ATC si existe"""
    # Campos donde puede estar el ATC
    atc_fields = ["atc", "atcCode", "ATC", "codigoATC", "atc_code"]
    
    for field in atc_fields:
        if field in product and product[field]:
            return product[field]
    
    # Buscar en descripción
    desc = product.get("large_description", "") or product.get("detailDescription", "")
    if desc:
        atc_pattern = r"[A-Z]\d{2}[A-Z]{2}\d{2}"
        match = re.search(atc_pattern, desc)
        if match:
            return match.group(0)
    
    return ""

def is_pharmaceutical(product):
    """Determinar si el producto es farmacéutico"""
    # Por categoría
    category = (product.get("categorie", "") or "").lower()
    subcategory = (product.get("subCategory", "") or "").lower()
    
    pharma_keywords = [
        "salud", "medicamento", "medicina", "farmac", "gripa", "dolor",
        "vitamina", "suplemento", "digestiv", "respiratori", "antibiotic",
        "antiinflamatori", "analgesic", "antipiretic", "dermatolog",
        "oftalmolog", "ginecolog", "pediatr", "cardiovascular"
    ]
    
    for keyword in pharma_keywords:
        if keyword in category or keyword in subcategory:
            return True
    
    # Por nombre de producto
    name = (product.get("mediaDescription", "") or product.get("description", "") or "").lower()
    pharma_terms = [
        "mg", "ml", "tableta", "cápsula", "jarabe", "suspensión", "solución",
        "crema", "gel", "ungüento", "gotas", "ampolla", "inyectable", "supositorio",
        "comprimido", "sobre", "polvo", "granulado", "spray nasal", "inhalador"
    ]
    
    for term in pharma_terms:
        if term in name:
            return True
    
    # Por si requiere receta
    if product.get("requirePrescription"):
        return True
    
    return False

def extract_lab_from_brand(product):
    """Extraer laboratorio de la marca o supplier"""
    # Campos posibles para laboratorio
    lab_fields = ["supplier", "marca", "brand", "laboratory", "laboratorio", "sup_description"]
    
    for field in lab_fields:
        if field in product and product[field]:
            return str(product[field]).strip()
    
    return ""

def process_product(product):
    """Procesar un producto y extraer todos los campos relevantes"""
    return {
        "id": product.get("id", ""),
        "barcode": product.get("barcode", ""),
        "nombre": product.get("mediaDescription", "") or product.get("description", ""),
        "descripcion": product.get("large_description", "") or product.get("largeDescription", ""),
        
        # FARMACOLÓGICO
        "laboratorio": extract_lab_from_brand(product),
        "marca": product.get("marca", ""),
        "principio_activo": extract_active_ingredient(product),
        "codigo_atc": extract_atc_code(product),
        "requiere_receta": product.get("requirePrescription", False),
        "es_generico": product.get("isGeneric", False),
        
        # CATEGORIZACIÓN
        "categoria": product.get("categorie", ""),
        "subcategoria": product.get("subCategory", ""),
        
        # COMERCIAL
        "precio_bs": product.get("fullPrice", 0),
        "precio_oferta_bs": product.get("offerPrice", 0),
        "ventas": product.get("sales", 0),
        "stock": product.get("stock", 0),
        "tiendas_total": product.get("storetotal", 0),
        "tiendas_sin_stock": product.get("storecero", 0),
        
        # MEDIA
        "imagen_url": product.get("mediaImageUrl", ""),
        
        # METADATA
        "scraped_at": datetime.now().isoformat()
    }

def main():
    print("=" * 70)
    print("🎖️ MISIÓN: EXTRACCIÓN COMPLETA DE PRODUCTOS FARMACOLÓGICOS VENEZUELA")
    print("=" * 70)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando operación...")
    
    # 1. Encontrar el índice correcto
    print("\n📋 FASE 1: Identificando índice de productos...")
    working_index = None
    
    for index in INDICES_TO_TRY:
        print(f"   Probando: {index}...", end=" ")
        result = search_algolia(index, "", hits_per_page=5)
        
        if result and "hits" in result and len(result["hits"]) > 0:
            total = result.get("nbHits", 0)
            print(f"✅ ENCONTRADO! ({total:,} productos)")
            working_index = index
            break
        else:
            print("❌")
    
    if not working_index:
        print("[FATAL] No se encontró ningún índice de productos")
        return
    
    # 2. Obtener TODOS los productos
    print(f"\n📋 FASE 2: Descargando TODOS los productos de '{working_index}'...")
    all_products = browse_all_products(working_index)
    print(f"   Total descargados: {len(all_products):,}")
    
    # 3. Filtrar solo productos farmacéuticos
    print("\n📋 FASE 3: Filtrando productos FARMACÉUTICOS...")
    pharma_products = []
    
    for product in all_products:
        if is_pharmaceutical(product):
            processed = process_product(product)
            pharma_products.append(processed)
    
    print(f"   Productos farmacéuticos encontrados: {len(pharma_products):,}")
    
    # 4. Extraer laboratorios únicos
    print("\n📋 FASE 4: Extrayendo LABORATORIOS únicos...")
    labs = defaultdict(int)
    for p in pharma_products:
        lab = p["laboratorio"] or p["marca"] or "Desconocido"
        labs[lab] += 1
    
    labs_sorted = sorted(labs.items(), key=lambda x: x[1], reverse=True)
    print(f"   Laboratorios únicos: {len(labs_sorted)}")
    print("   Top 10 laboratorios:")
    for lab, count in labs_sorted[:10]:
        print(f"      - {lab}: {count} productos")
    
    # 5. Estadísticas de ATC y Principio Activo
    print("\n📋 FASE 5: Analizando códigos ATC y principios activos...")
    with_atc = sum(1 for p in pharma_products if p["codigo_atc"])
    with_active = sum(1 for p in pharma_products if p["principio_activo"])
    
    print(f"   Con código ATC: {with_atc} ({with_atc/len(pharma_products)*100:.1f}%)")
    print(f"   Con principio activo identificado: {with_active} ({with_active/len(pharma_products)*100:.1f}%)")
    
    # 6. Guardar resultados
    print("\n📋 FASE 6: Guardando resultados...")
    
    # JSON completo
    with open("venezuela_pharma_products.json", "w", encoding="utf-8") as f:
        json.dump(pharma_products, f, ensure_ascii=False, indent=2)
    print(f"   ✅ venezuela_pharma_products.json ({len(pharma_products):,} productos)")
    
    # CSV para análisis
    if pharma_products:
        fieldnames = pharma_products[0].keys()
        with open("venezuela_pharma_products.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(pharma_products)
        print(f"   ✅ venezuela_pharma_products.csv")
    
    # Laboratorios
    with open("venezuela_labs.json", "w", encoding="utf-8") as f:
        json.dump(dict(labs_sorted), f, ensure_ascii=False, indent=2)
    print(f"   ✅ venezuela_labs.json ({len(labs_sorted)} laboratorios)")
    
    # Resumen
    summary = {
        "fecha_extraccion": datetime.now().isoformat(),
        "indice_usado": working_index,
        "total_productos_descargados": len(all_products),
        "productos_farmaceuticos": len(pharma_products),
        "laboratorios_unicos": len(labs_sorted),
        "productos_con_atc": with_atc,
        "productos_con_principio_activo": with_active,
        "top_10_labs": dict(labs_sorted[:10])
    }
    
    with open("venezuela_pharma_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"   ✅ venezuela_pharma_summary.json")
    
    # 7. Reporte final
    print("\n" + "=" * 70)
    print("🎖️ MISIÓN COMPLETADA")
    print("=" * 70)
    print(f"""
📊 RESUMEN:
   • Total productos en Algolia: {len(all_products):,}
   • Productos farmacéuticos: {len(pharma_products):,}
   • Laboratorios únicos: {len(labs_sorted)}
   • Con código ATC: {with_atc}
   • Con principio activo: {with_active}

📁 ARCHIVOS GENERADOS:
   • venezuela_pharma_products.json (datos completos)
   • venezuela_pharma_products.csv (para Excel/análisis)
   • venezuela_labs.json (listado de laboratorios)
   • venezuela_pharma_summary.json (resumen ejecutivo)
""")
    
    return pharma_products, labs_sorted

if __name__ == "__main__":
    main()
