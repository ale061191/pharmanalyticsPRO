
# Documentación Técnica del Sistema Pharmanalytics (Módulo Farmatodo)

**Fecha:** 18 de Enero, 2026
**Versión:** 1.0 (MVP Funcional)

---

## 1. Resumen Ejecutivo
Este documento detalla la arquitectura, lógica y componentes del sistema diseñado para la extracción masiva y recurrente de datos de **Farmatodo Venezuela**. El sistema logra obtener no solo el catálogo público, sino datos "invisibles" de inventario granular (unidades exactas por tienda) mediante ingeniería inversa de las APIs privadas.

---

## 2. Desafíos y Soluciones

| Desafío Detectado | Solución Implementada | Resultado |
| :--- | :--- | :--- |
| **Bloqueo WAF (Access Denied)** | Simulación de Headers de Navegador (`User-Agent`, `Origin`, `Referer`). | Bypaseo exitoso de Cloudflare (Status 403 -> 200). |
| **Límite de Algolia (1000 items)** | Implementación de estrategia "Prefix Search" (iterar búsquedas de 'a' a 'z', '0' a '9'). | Extracción del catálogo completo (~7,870 productos). |
| **API Privada de Stock** | Ingeniería Inversa de tráfico de red para capturar el `Token` de invitado estático. | Acceso a `getItemAvailableStoresCity2` (Unidades exactas). |

---

## 3. Arquitectura del Sistema

El sistema opera en 3 fases secuenciales (Pipeline):

1.  **Fase de Cosecha (Harvest):**
    *   Consulta el motor de búsqueda **Algolia** de Farmatodo.
    *   Deduplica productos y descarga metadatos base.

2.  **Fase de Enriquecimiento (Enrich):**
    *   Toma los productos cosechados.
    *   Consulta la **API Transaccional Privada** para cada producto relevante.
    *   Extrae el desglose de inventario para las ciudades objetivo.

3.  **Fase de Fusión (Merge):**
    *   Unifica metadatos + stock granular en un "Maestro de Datos".
    *   Este archivo alimenta la Base de Datos (Supabase).

---

## 4. Credenciales y Endpoints (Technical Blueprint)

> **NOTA DE SEGURIDAD:** Las claves reales NO se incluyen en este repositorio. Consulte el archivo local `.env.local` o el gestor de secretos de su despliegue (Vercel).

### A. Algolia (Catálogo de Productos)
*   **App ID:** `VCOJEYD2PO`
*   **API Key:** *(Ver Variables de Entorno)*
*   **Índice Objetivo:** `products-venezuela`

### B. API Transaccional (Stock Granular)
*   **Endpoint:** `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2`
*   **Método:** `GET`
*   **Headers Críticos:**
    *   `DEVICE-ID`: *(Ver Variables de Entorno)*
    *   `token`: *(Ver Variables de Entorno)*
    *   `tokenIdWebSafe`: *(Ver Variables de Entorno)*
    *   `key`: *(Ver Variables de Entorno)*

---

## 5. Archivos del Sistema (Referencia)

Los scripts operativos se encuentran en `master/`:

*   `harvest_medicines.js`: Script de extracción masiva de Algolia.
*   `enrich_stock_massive.js`: Script de consulta de stock detallado (API Privada).
*   `populate_db.js`: Script de unificación de datos hacia Supabase.
*   `data/`: Carpeta contenedora de los resultados JSON (Ignorada en Git).

---

## 6. Automatización

**Automatización:**
Para producción, se configurarán como tareas **CRON** en el servidor:
```bash
# Ejemplo de Cron diario
0 3 * * * node master/harvest_medicines.js && node master/enrich_stock_massive.js && node master/populate_db.js
```
