"""
🎖️ MISIÓN V2: Extracción COMPLETA de Productos Farmacológicos Venezuela
=========================================================================
MEJORAS:
- Paginación correcta para obtener TODOS los productos
- Mejor filtrado de productos farmacéuticos
- Extracción mejorada de principio activo

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

DELAY = 0.4  # 400ms entre requests para no ser bloqueado

def search_algolia(query="", hits_per_page=1000, page=0, filters=""):
    """Búsqueda en Algolia"""
    url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{INDEX_NAME}/query"
    
    params = f"query={query}&hitsPerPage={hits_per_page}&page={page}"
    if filters:
        params += f"&filters={filters}"
    
    payload = {"params": params}
    
    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=20)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[ERROR] Status {response.status_code}")
            return None
    except Exception as e:
        print(f"[ERROR] {e}")
        return None

def get_all_products():
    """Obtener TODOS los productos con paginación correcta"""
    all_products = []
    page = 0
    
    # Primera request para saber total
    result = search_algolia("", hits_per_page=1000, page=0)
    if not result:
        return []
    
    total_hits = result.get("nbHits", 0)
    total_pages = result.get("nbPages", 1)
    
    print(f"[INFO] Total productos en Algolia: {total_hits:,}")
    print(f"[INFO] Total páginas: {total_pages}")
    
    all_products.extend(result.get("hits", []))
    print(f"[INFO] Página 1/{total_pages}: {len(result.get('hits', []))} productos")
    
    # Obtener resto de páginas
    for page in range(1, total_pages):
        time.sleep(DELAY)
        print(f"[INFO] Página {page+1}/{total_pages}...", end=" ")
        
        result = search_algolia("", hits_per_page=1000, page=page)
        if result and "hits" in result:
            hits = result.get("hits", [])
            all_products.extend(hits)
            print(f"{len(hits)} productos")
        else:
            print("ERROR")
            break
    
    return all_products

def is_pharmaceutical(product):
    """Determinar si es producto farmacéutico (ESTRICTO)"""
    category = (product.get("categorie", "") or "").lower()
    subcategory = (product.get("subCategory", "") or "").lower()
    name = (product.get("mediaDescription", "") or product.get("description", "") or "").lower()
    
    # Categorías que son DEFINITIVAMENTE farmacéuticas
    pharma_categories = [
        "salud y medicamentos",
        "salud digestiva", 
        "tratamiento de la gripa",
        "dolor de cabeza",
        "sistema respiratorio",
        "vitaminas y suplementos",
        "salud sexual",
        "antibióticos",
        "antiinflamatorios",
        "sistema cardiovascular",
        "sistema nervioso",
        "oftalmología",
        "ginecología",
        "dermatología",
        "antialérgicos",
    ]
    
    for cat in pharma_categories:
        if cat in category or cat in subcategory:
            return True
    
    # Subcategorías farmacéuticas
    pharma_subcats = [
        "medicamentos", "analgésicos", "antigripales", "antiácidos",
        "laxantes", "antidiarréicos", "suplementos", "vitaminas",
        "antiinflamatorios", "antibióticos", "antihistamínicos",
        "antitusivos", "expectorantes", "descongestionantes",
        "pomadas", "ungüentos", "gotas oftálmicas", "gotas óticas"
    ]
    
    for subcat in pharma_subcats:
        if subcat in subcategory:
            return True
    
    # Por palabras clave en el nombre que indican medicamento
    pharma_keywords = [
        " mg ", " mg/", " mcg", " ui ", " ml ", "/ml",
        "tableta", "cápsula", "comprimido", "gragea",
        "jarabe", "suspensión", "solución oral",
        "ampolla", "inyectable", "vial",
        "crema medicada", "pomada", "ungüento",
        "supositorio", "óvulo",
        "gotas", "spray nasal", "inhalador",
        "parche", "sobre", "granulado",
        "acetaminofén", "ibuprofeno", "paracetamol", "aspirina",
        "omeprazol", "ranitidina", "metformina", "losartán",
        "amoxicilina", "azitromicina", "ciprofloxacina",
        "diclofenaco", "naproxeno", "meloxicam",
        "loratadina", "cetirizina", "difenhidramina",
        "salbutamol", "beclometasona", "fluticasona"
    ]
    
    for keyword in pharma_keywords:
        if keyword in name:
            return True
    
    # Si requiere receta, es medicamento
    if product.get("requirePrescription"):
        return True
    
    return False

def extract_active_ingredient(product):
    """Extraer principio activo del nombre o descripción"""
    name = product.get("mediaDescription", "") or product.get("description", "") or ""
    desc = product.get("large_description", "") or product.get("largeDescription", "") or ""
    
    # Buscar en descripción larga primero
    if desc:
        # Patrón: "Principio Activo: XXX"
        match = re.search(r"principio\s+activo[:\s]+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)", desc, re.IGNORECASE)
        if match:
            return match.group(1).strip().title()
        
        # Patrón: "Contiene: XXX mg"
        match = re.search(r"contiene[:\s]+([A-Za-záéíóúñ]+)", desc, re.IGNORECASE)
        if match:
            return match.group(1).strip().title()
    
    # Extraer del nombre del producto
    if name:
        # Patrón común: "Principio Activo + Dosis + Marca"
        # Ej: "Acetaminofén 500 mg Genfar Tabletas"
        match = re.search(r"^([A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)?)\s+\d+\s*(?:mg|g|ml|mcg|ui)", name, re.IGNORECASE)
        if match:
            active = match.group(1).strip()
            # Filtrar palabras que no son principios activos
            exclude = ["crema", "gel", "jarabe", "tableta", "cápsula", "solución", "suspensión"]
            if active.lower() not in exclude:
                return active.title()
        
        # Patrón alternativo: buscar principios activos conocidos
        known_actives = [
            "acetaminofén", "acetaminofen", "paracetamol", "ibuprofeno",
            "diclofenaco", "naproxeno", "meloxicam", "piroxicam",
            "omeprazol", "ranitidina", "pantoprazol", "esomeprazol",
            "loratadina", "cetirizina", "fexofenadina", "difenhidramina",
            "amoxicilina", "azitromicina", "ciprofloxacina", "metronidazol",
            "metformina", "glibenclamida", "insulina",
            "losartán", "enalapril", "amlodipino", "atenolol",
            "salbutamol", "beclometasona", "fluticasona",
            "ácido fólico", "ácido acetilsalicílico", "aspirina",
            "vitamina c", "vitamina d", "vitamina b12", "complejo b",
            "dipirona", "metamizol", "tramadol", "ketorolaco"
        ]
        
        name_lower = name.lower()
        for active in known_actives:
            if active in name_lower:
                return active.title()
    
    return ""

def extract_lab(product):
    """Extraer laboratorio/fabricante"""
    # Campos donde puede estar el lab
    lab = product.get("supplier", "") or product.get("sup_description", "")
    
    if lab and lab.strip():
        return lab.strip()
    
    # Intentar desde marca
    marca = product.get("marca", "")
    if marca:
        return marca.strip()
    
    # Desde brand
    brand = product.get("brand", "")
    if brand and not brand.startswith("200"):  # Excluir códigos
        return brand.strip()
    
    return ""

def process_pharma_product(product):
    """Procesar producto farmacéutico"""
    return {
        "id": product.get("id", ""),
        "codigo_barras": product.get("barcode", ""),
        "nombre_producto": product.get("mediaDescription", "") or product.get("description", ""),
        "descripcion_detallada": product.get("large_description", "") or product.get("largeDescription", ""),
        
        # DATOS FARMACOLÓGICOS
        "laboratorio": extract_lab(product),
        "marca": product.get("marca", ""),
        "principio_activo": extract_active_ingredient(product),
        "codigo_atc": "",  # Algolia no parece tener este campo
        "requiere_receta": product.get("requirePrescription", False),
        "es_generico": product.get("isGeneric", False),
        
        # CATEGORIZACIÓN
        "categoria": product.get("categorie", ""),
        "subcategoria": product.get("subCategory", ""),
        
        # DATOS COMERCIALES
        "precio_bs": product.get("fullPrice", 0),
        "precio_oferta": product.get("offerPrice", 0),
        "ventas_totales": product.get("sales", 0),
        "stock_actual": product.get("stock", 0),
        "tiendas_con_producto": product.get("storetotal", 0),
        "tiendas_sin_stock": product.get("storecero", 0),
        
        "imagen_url": product.get("mediaImageUrl", ""),
        "fecha_extraccion": datetime.now().isoformat()
    }

def main():
    print("=" * 70)
    print("🎖️ MISIÓN V2: EXTRACCIÓN TOTAL PRODUCTOS FARMACÉUTICOS VENEZUELA")
    print("=" * 70)
    start_time = datetime.now()
    print(f"[{start_time.strftime('%H:%M:%S')}] Iniciando operación...\n")
    
    # FASE 1: Obtener todos los productos
    print("📋 FASE 1: Descargando TODOS los productos de Algolia...")
    all_products = get_all_products()
    print(f"   ✅ Total descargados: {len(all_products):,}\n")
    
    if not all_products:
        print("[FATAL] No se pudieron obtener productos")
        return
    
    # FASE 2: Filtrar farmacéuticos
    print("📋 FASE 2: Identificando productos FARMACÉUTICOS...")
    pharma_raw = [p for p in all_products if is_pharmaceutical(p)]
    print(f"   ✅ Productos farmacéuticos identificados: {len(pharma_raw):,}\n")
    
    # FASE 3: Procesar y enriquecer datos
    print("📋 FASE 3: Procesando datos (lab, principio activo, etc.)...")
    pharma_processed = [process_pharma_product(p) for p in pharma_raw]
    print(f"   ✅ Productos procesados: {len(pharma_processed):,}\n")
    
    # FASE 4: Estadísticas de laboratorios
    print("📋 FASE 4: Analizando LABORATORIOS...")
    labs = defaultdict(list)
    for p in pharma_processed:
        lab = p["laboratorio"] or "Desconocido"
        labs[lab].append(p["nombre_producto"])
    
    labs_count = {lab: len(prods) for lab, prods in labs.items()}
    labs_sorted = sorted(labs_count.items(), key=lambda x: x[1], reverse=True)
    
    print(f"   ✅ Laboratorios únicos: {len(labs_sorted)}")
    print("   Top 15 Laboratorios:")
    for lab, count in labs_sorted[:15]:
        print(f"      • {lab}: {count} productos")
    
    # FASE 5: Estadísticas de principios activos
    print("\n📋 FASE 5: Analizando PRINCIPIOS ACTIVOS...")
    activos = defaultdict(int)
    for p in pharma_processed:
        if p["principio_activo"]:
            activos[p["principio_activo"]] += 1
    
    activos_sorted = sorted(activos.items(), key=lambda x: x[1], reverse=True)
    with_active = sum(1 for p in pharma_processed if p["principio_activo"])
    
    print(f"   ✅ Productos con principio activo identificado: {with_active} ({with_active/len(pharma_processed)*100:.1f}%)")
    print(f"   ✅ Principios activos únicos: {len(activos_sorted)}")
    print("   Top 15 Principios Activos:")
    for active, count in activos_sorted[:15]:
        print(f"      • {active}: {count} productos")
    
    # FASE 6: Guardar resultados
    print("\n📋 FASE 6: Guardando archivos...")
    
    # 1. JSON con todos los productos farmacéuticos
    with open("VENEZUELA_PHARMA_PRODUCTOS.json", "w", encoding="utf-8") as f:
        json.dump(pharma_processed, f, ensure_ascii=False, indent=2)
    print(f"   ✅ VENEZUELA_PHARMA_PRODUCTOS.json ({len(pharma_processed):,} productos)")
    
    # 2. CSV para análisis
    if pharma_processed:
        fieldnames = pharma_processed[0].keys()
        with open("VENEZUELA_PHARMA_PRODUCTOS.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(pharma_processed)
        print("   ✅ VENEZUELA_PHARMA_PRODUCTOS.csv")
    
    # 3. Laboratorios con sus productos
    labs_detail = {lab: {"total_productos": len(prods), "productos": prods[:10]} 
                   for lab, prods in labs.items()}
    with open("VENEZUELA_LABORATORIOS.json", "w", encoding="utf-8") as f:
        json.dump(labs_detail, f, ensure_ascii=False, indent=2)
    print(f"   ✅ VENEZUELA_LABORATORIOS.json ({len(labs_detail)} laboratorios)")
    
    # 4. Principios activos
    with open("VENEZUELA_PRINCIPIOS_ACTIVOS.json", "w", encoding="utf-8") as f:
        json.dump(dict(activos_sorted), f, ensure_ascii=False, indent=2)
    print(f"   ✅ VENEZUELA_PRINCIPIOS_ACTIVOS.json ({len(activos_sorted)} principios activos)")
    
    # 5. Resumen ejecutivo
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    summary = {
        "mision": "Extracción Productos Farmacéuticos Venezuela",
        "fecha_inicio": start_time.isoformat(),
        "fecha_fin": end_time.isoformat(),
        "duracion_segundos": duration,
        "indice_algolia": INDEX_NAME,
        "total_productos_algolia": len(all_products),
        "productos_farmaceuticos": len(pharma_processed),
        "laboratorios_unicos": len(labs_sorted),
        "principios_activos_unicos": len(activos_sorted),
        "productos_con_principio_activo": with_active,
        "porcentaje_con_principio_activo": round(with_active/len(pharma_processed)*100, 1),
        "top_10_laboratorios": dict(labs_sorted[:10]),
        "top_10_principios_activos": dict(activos_sorted[:10])
    }
    
    with open("VENEZUELA_PHARMA_RESUMEN.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("   ✅ VENEZUELA_PHARMA_RESUMEN.json")
    
    # REPORTE FINAL
    print("\n" + "=" * 70)
    print("🎖️ MISIÓN COMPLETADA CON ÉXITO")
    print("=" * 70)
    print(f"""
📊 RESULTADOS FINALES:
   ════════════════════════════════════════════════
   • Total productos Farmatodo VE:     {len(all_products):,}
   • Productos FARMACÉUTICOS:          {len(pharma_processed):,}
   • Laboratorios únicos:              {len(labs_sorted)}
   • Principios activos identificados: {len(activos_sorted)}
   • Cobertura principio activo:       {with_active/len(pharma_processed)*100:.1f}%
   ════════════════════════════════════════════════
   
📁 ARCHIVOS GENERADOS:
   • VENEZUELA_PHARMA_PRODUCTOS.json   (datos completos)
   • VENEZUELA_PHARMA_PRODUCTOS.csv    (Excel/análisis)
   • VENEZUELA_LABORATORIOS.json       (listado labs)
   • VENEZUELA_PRINCIPIOS_ACTIVOS.json (ingredientes)
   • VENEZUELA_PHARMA_RESUMEN.json     (resumen)

⏱️ Tiempo de ejecución: {duration:.1f} segundos
""")
    
    return pharma_processed, labs_sorted, activos_sorted

if __name__ == "__main__":
    main()
