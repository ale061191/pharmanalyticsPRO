"""
Pharmanalytics Farmatodo Scraper v2.0
=====================================
Extrae datos de productos, ventas y stock desde Algolia

Campos extraídos:
- Información básica del producto
- Número de VENTAS (sales)
- Stock actual y por tiendas
- Precios

Autor: AI Assistant para Pharmanalytics
Fecha: 2026-01-20
"""

import requests
import json
import time
from datetime import datetime
import csv

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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Rate limiting: segundos entre requests
DELAY_BETWEEN_REQUESTS = 0.5

def search_algolia(query="", hits_per_page=100, page=0, filters=""):
    """
    Ejecutar búsqueda en Algolia con paginación
    """
    url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/{INDEX_NAME}/query"
    
    params = f"query={query}&hitsPerPage={hits_per_page}&page={page}"
    if filters:
        params += f"&filters={filters}"
    
    payload = {"params": params}
    
    try:
        response = requests.post(url, headers=HEADERS, json=payload, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[ERROR] Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
        return None

def extract_product_data(hit):
    """
    Extraer todos los campos relevantes de un producto
    """
    # Calcular tiendas con stock
    tiendas_total = hit.get("storetotal", 0) or 0
    tiendas_sin_stock = hit.get("storecero", 0) or 0
    tiendas_con_stock = tiendas_total - tiendas_sin_stock
    
    # Calcular cobertura
    cobertura = (tiendas_con_stock / tiendas_total * 100) if tiendas_total > 0 else 0
    
    return {
        # Identificación
        "id": hit.get("id"),
        "barcode": hit.get("barcode"),
        "object_id": hit.get("objectID"),
        
        # Nombre y descripción
        "nombre": hit.get("mediaDescription") or hit.get("description", ""),
        "descripcion_corta": hit.get("description", ""),
        "descripcion_larga": hit.get("large_description", ""),
        
        # Marca y categoría
        "marca": hit.get("marca", ""),
        "categoria": hit.get("categorie", ""),
        "subcategoria": hit.get("subCategory", ""),
        
        # ========================
        # VENTAS - CRÍTICO
        # ========================
        "ventas_total": hit.get("sales", 0),
        "cantidad_vendida": hit.get("quantitySold", 0),
        
        # ========================
        # STOCK - CRÍTICO  
        # ========================
        "stock_actual": hit.get("stock", 0),
        "stock_total": hit.get("totalStock", 0),
        "sin_stock": hit.get("without_stock", False),
        "stock_promedio": hit.get("avg_stock", 0),
        "stock_maximo": hit.get("totalmax_stock", 0),
        
        # ========================
        # TIENDAS - CRÍTICO
        # ========================
        "tiendas_total": tiendas_total,
        "tiendas_sin_stock": tiendas_sin_stock,
        "tiendas_con_stock": tiendas_con_stock,
        "cobertura_tiendas_pct": round(cobertura, 2),
        
        # Precios
        "precio_bs": hit.get("fullPrice", 0),
        "precio_oferta_bs": hit.get("offerPrice", 0),
        "precio_prime_bs": hit.get("primePrice", 0),
        "tiene_oferta": (hit.get("offerPrice", 0) or 0) > 0,
        
        # Otros
        "imagen_url": hit.get("mediaImageUrl", ""),
        "requiere_receta": hit.get("requirePrescription", False),
        "es_generico": hit.get("isGeneric", False),
        "solo_online": hit.get("onlyOnline", False),
        
        # Metadata
        "scraped_at": datetime.now().isoformat()
    }

def scrape_all_products(max_products=None, categories=None):
    """
    Scrapear todos los productos disponibles
    
    Args:
        max_products: Límite máximo de productos (None = sin límite)
        categories: Lista de categorías a scrapear (None = todas)
    """
    all_products = []
    page = 0
    hits_per_page = 100
    
    print(f"[INFO] Iniciando scraping de productos...")
    print(f"[INFO] Max productos: {max_products or 'Sin límite'}")
    
    while True:
        print(f"[INFO] Fetching page {page}...")
        
        result = search_algolia("", hits_per_page=hits_per_page, page=page)
        
        if not result or "hits" not in result:
            print("[ERROR] No se pudo obtener resultados")
            break
        
        hits = result["hits"]
        if not hits:
            print("[INFO] No más resultados")
            break
        
        for hit in hits:
            producto = extract_product_data(hit)
            all_products.append(producto)
            
            if max_products and len(all_products) >= max_products:
                break
        
        print(f"[INFO] Productos recolectados: {len(all_products)}")
        
        if max_products and len(all_products) >= max_products:
            break
        
        # Verificar si hay más páginas
        total_pages = result.get("nbPages", 0)
        if page >= total_pages - 1:
            break
        
        page += 1
        time.sleep(DELAY_BETWEEN_REQUESTS)  # Rate limiting
    
    return all_products

def get_top_sellers(limit=50):
    """
    Obtener los productos más vendidos
    """
    result = search_algolia("", hits_per_page=1000)
    
    if not result:
        return []
    
    productos = [extract_product_data(hit) for hit in result.get("hits", [])]
    
    # Ordenar por ventas (descendente)
    productos.sort(key=lambda x: x["ventas_total"], reverse=True)
    
    return productos[:limit]

def get_low_stock_alerts(stock_threshold=10, min_sales=100):
    """
    Obtener productos con riesgo de agotamiento
    (stock bajo + ventas altas)
    """
    result = search_algolia("", hits_per_page=1000)
    
    if not result:
        return []
    
    productos = [extract_product_data(hit) for hit in result.get("hits", [])]
    
    # Filtrar por stock bajo y ventas altas
    alertas = [
        p for p in productos
        if p["stock_actual"] <= stock_threshold and p["ventas_total"] >= min_sales
    ]
    
    # Ordenar por stock (ascendente)
    alertas.sort(key=lambda x: x["stock_actual"])
    
    return alertas

def save_to_json(data, filename):
    """Guardar datos en JSON"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Guardado en {filename}")

def save_to_csv(data, filename):
    """Guardar datos en CSV"""
    if not data:
        print("[WARN] No hay datos para guardar")
        return
    
    fieldnames = data[0].keys()
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"[INFO] Guardado en {filename}")

def main():
    print("=" * 60)
    print("🔬 PHARMANALYTICS - FARMATODO SCRAPER v2.0")
    print("=" * 60)
    
    # 1. Obtener Top Sellers
    print("\n📊 Obteniendo Top 20 productos más vendidos...")
    top_sellers = get_top_sellers(20)
    
    print("\n🏆 TOP 10 MÁS VENDIDOS:")
    for i, p in enumerate(top_sellers[:10], 1):
        print(f"  {i}. {p['nombre'][:45]}...")
        print(f"     💰 Ventas: {p['ventas_total']:,.0f} | 📦 Stock: {p['stock_actual']} | 🏪 Tiendas: {p['tiendas_con_stock']}/{p['tiendas_total']}")
    
    # 2. Obtener alertas de stock bajo
    print("\n⚠️ Obteniendo alertas de stock bajo...")
    alertas = get_low_stock_alerts(stock_threshold=20, min_sales=500)
    
    if alertas:
        print(f"\n🚨 {len(alertas)} PRODUCTOS EN RIESGO DE AGOTAMIENTO:")
        for p in alertas[:5]:
            print(f"  ❗ {p['nombre'][:45]}...")
            print(f"     Stock: {p['stock_actual']} | Ventas: {p['ventas_total']:,.0f}")
    else:
        print("  ✅ No hay alertas críticas")
    
    # 3. Guardar datos completos
    print("\n💾 Guardando datos...")
    save_to_json(top_sellers, "pharmanalytics_top_sellers.json")
    save_to_csv(top_sellers, "pharmanalytics_top_sellers.csv")
    
    if alertas:
        save_to_json(alertas, "pharmanalytics_stock_alerts.json")
    
    print("\n✅ Scraping completado!")
    print("=" * 60)

if __name__ == "__main__":
    main()
