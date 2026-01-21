# 📊 Guía de Datos de Algolia - Farmatodo Venezuela

## Credenciales de Acceso (PÚBLICAS - Bajo Riesgo)

```python
APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"  # Search-only key (público)
INDEX = "products"  # Índice de productos
```

> ⚠️ **Nota de Seguridad**: Estas credenciales son claves de búsqueda públicas, embebidas en el código JavaScript del sitio web. Son usadas por miles de visitantes diariamente. El riesgo es BAJO si se usan responsablemente (rate limiting, headers realistas).

---

## 📦 Campos Disponibles por Producto

### Información Básica
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del producto |
| `objectID` | string | ID de Algolia (generalmente igual a `id`) |
| `barcode` | string | Código de barras |
| `description` | string | Nombre corto del producto |
| `mediaDescription` | string | Nombre completo del producto |
| `marca` | string | Marca del producto |
| `categorie` | string | Categoría principal |
| `mediaImageUrl` | string | URL de la imagen |

### 💰 Precios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `fullPrice` | float | Precio regular (en Bs sin decimales, ej: 8100 = Bs 81.00) |
| `offerPrice` | float | Precio de oferta (0 si no hay oferta) |
| `primePrice` | float | Precio para suscriptores Prime |

### 📈 **VENTAS (MUY IMPORTANTE PARA PHARMANALYTICS)**
| Campo | Tipo | Descripción | Uso Recomendado |
|-------|------|-------------|-----------------|
| `sales` | float | **Unidades vendidas** (histórico o período) | Ranking de productos más vendidos |
| `quantitySold` | int | Cantidad vendida (puede ser 0) | Verificar correlación con `sales` |

**Ejemplo de uso para Pharmanalytics:**
```python
# Ordenar por más vendidos
productos_ordenados = sorted(productos, key=lambda x: x.get('sales', 0), reverse=True)
top_10_vendidos = productos_ordenados[:10]
```

### 📦 **STOCK (CRÍTICO)**
| Campo | Tipo | Descripción | Uso |
|-------|------|-------------|-----|
| `stock` | int | Stock disponible actual | Inventario general |
| `totalStock` | int | Stock total (generalmente = stock) | Confirmación |
| `without_stock` | bool | `true` si está agotado | Filtrar agotados |
| `avg_stock` | float | Stock promedio histórico | Análisis de tendencias |
| `totalmax_stock` | int | Stock máximo registrado | Capacidad de reposición |

### 🏪 **STOCK POR TIENDAS (LO QUE BUSCABAS)**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `storetotal` | int | **Total de tiendas que venden este producto** |
| `storecero` | int | **Tiendas con stock = 0** |

**Cálculo de cobertura:**
```python
tiendas_con_stock = producto['storetotal'] - producto['storecero']
porcentaje_cobertura = (tiendas_con_stock / producto['storetotal']) * 100 if producto['storetotal'] > 0 else 0
```

---

## 🔧 Script de Ejemplo Completo

```python
import requests
import json
from datetime import datetime

APP_ID = "VCOJEYD2PO"
API_KEY = "869a91e98550dd668b8b1dc04bca9011"

HEADERS = {
    "X-Algolia-Application-Id": APP_ID,
    "X-Algolia-API-Key": API_KEY,
    "Content-Type": "application/json",
    "Referer": "https://www.farmatodo.com.ve/",
    "Origin": "https://www.farmatodo.com.ve",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
}

def search_products(query="", hits_per_page=50, page=0):
    """
    Buscar productos en Algolia
    """
    url = f"https://{APP_ID}-dsn.algolia.net/1/indexes/products/query"
    
    payload = {
        "params": f"query={query}&hitsPerPage={hits_per_page}&page={page}"
    }
    
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        return None

def extract_product_data(hit):
    """
    Extraer datos relevantes de un producto
    """
    return {
        "id": hit.get("id"),
        "nombre": hit.get("mediaDescription") or hit.get("description"),
        "marca": hit.get("marca"),
        "categoria": hit.get("categorie"),
        "precio": hit.get("fullPrice", 0) / 100,  # Convertir a Bs
        "precio_oferta": hit.get("offerPrice", 0) / 100,
        
        # VENTAS
        "ventas": hit.get("sales", 0),
        "cantidad_vendida": hit.get("quantitySold", 0),
        
        # STOCK
        "stock": hit.get("stock", 0),
        "stock_total": hit.get("totalStock", 0),
        "sin_stock": hit.get("without_stock", False),
        "stock_promedio": hit.get("avg_stock", 0),
        
        # TIENDAS
        "tiendas_total": hit.get("storetotal", 0),
        "tiendas_sin_stock": hit.get("storecero", 0),
        "tiendas_con_stock": hit.get("storetotal", 0) - hit.get("storecero", 0),
        
        "imagen": hit.get("mediaImageUrl"),
        "timestamp": datetime.now().isoformat()
    }

def get_top_sellers(query="", limit=20):
    """
    Obtener los productos más vendidos de una categoría
    """
    result = search_products(query, hits_per_page=100)
    if not result:
        return []
    
    productos = [extract_product_data(hit) for hit in result.get("hits", [])]
    
    # Ordenar por ventas
    productos_ordenados = sorted(productos, key=lambda x: x["ventas"], reverse=True)
    
    return productos_ordenados[:limit]

def get_low_stock_alerts(threshold=10):
    """
    Obtener productos con stock bajo (posible desabastecimiento)
    """
    result = search_products("", hits_per_page=100)
    if not result:
        return []
    
    productos = [extract_product_data(hit) for hit in result.get("hits", [])]
    
    # Filtrar por stock bajo pero con ventas altas
    alertas = [
        p for p in productos 
        if p["stock"] <= threshold and p["ventas"] > 100
    ]
    
    return sorted(alertas, key=lambda x: x["stock"])

if __name__ == "__main__":
    print("=== TOP 10 Productos Más Vendidos ===")
    top = get_top_sellers("", 10)
    for i, p in enumerate(top, 1):
        print(f"{i}. {p['nombre'][:50]}...")
        print(f"   Ventas: {p['ventas']:,.0f} | Stock: {p['stock']} | Tiendas: {p['tiendas_con_stock']}/{p['tiendas_total']}")
        print()
```

---

## 🚨 Importante: Stock por Tienda Individual

**Estado Actual:** Algolia solo proporciona datos agregados (`storetotal`, `storecero`), NO el desglose por tienda individual.

**Para obtener stock por tienda específica**, necesitarías:
1. La API interna de Appsmith (requiere autenticación - bloqueada)
2. Capturar tráfico de la app móvil cuando muestra "stock por tienda" (bloqueado por anti-Frida)

**Alternativa viable:** 
- Usar `tiendas_con_stock` = `storetotal - storecero` para saber cuántas tiendas tienen el producto
- Combinarlo con la lista de tiendas cercanas de `/route/r/VE/v1/stores/nearby`

---

## 📊 Métricas Clave para Pharmanalytics

| Métrica | Cálculo | Uso |
|---------|---------|-----|
| **Cobertura de tiendas** | `(storetotal - storecero) / storetotal * 100` | % de tiendas con stock |
| **Velocidad de rotación** | `sales / stock` | Qué tan rápido se vende |
| **Riesgo de agotamiento** | `stock <= 10 AND sales > 1000` | Alertas tempranas |
| **Popularidad relativa** | `sales / max(sales_categoria)` | Ranking dentro de categoría |

---

## ✅ Recomendaciones de Uso

1. **Rate Limiting**: Máximo 2 requests/segundo
2. **Caching**: Guardar resultados por 1 hora mínimo
3. **Horarios**: Evitar picos (12pm-2pm, 7pm-9pm)
4. **User-Agent**: Siempre usar uno realista
5. **Referer/Origin**: Incluir siempre para evitar bloqueos
