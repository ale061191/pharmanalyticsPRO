# Reporte de Desafíos Técnicos: Farmatodo Scraping

## 📋 Contexto del Proyecto
Estamos desarrollando **Pharmanalytics**, un dashboard para rastrear precios y stock de productos farmacéuticos en Venezuela, específicamente de **Farmatodo (farmatodo.com.ve)**.
El sistema utiliza:
- **Frontend:** Next.js 16 (App Router)
- **Backend:** Next.js API Routes (Server WebSockets / HTTP)
- **Scraper:** Puppeteer (Headless Chrome)
- **Base de Datos:** Supabase

## 🔴 Problemas Actuales

### 1. Inestabilidad de Selectores (Precios Incorrectos)
**El Problema:**
El scraper extrae precios que a veces no coinciden con lo que ve el usuario.
- El DOM de Farmatodo parece tener múltiples nodos de precio (algunos ocultos, otros móviles).
- Intentamos usar selectores como `.text-price` o `.price` pero fallan.
- Recientemente descubrimos `.product-purchase__price--active` para el precio de oferta, pero la consistencia entre productos varía.
- Al fallar el selector, el sistema hace fallback a datos "Mock" (ficticios), confundiendo al usuario.

**Pregunta para Agentes:**
¿Cuál es la estrategia más robusta para identificar el "Precio Real/Mostrado" en un SPA (Single Page Application) moderno donde el DOM está muy anidado y lleno de clases utilitarias (`v-0239`, etc.) o cambiantes?

### 2. Extracción de Stock Compleja (Fragmentación Geográfica)
**El Problema:**
Farmatodo no muestra un "Stock Total Global". Muestra stock **por tienda** basado en la geolocalización del navegador.
- Nuestro Puppeteer corre en un servidor (sin geolocalización específica), por lo que Farmatodo carga una ubicación por defecto (o ninguna).
- El usuario ve "229 unidades" en su navegador (porque está geolocalizado en Caracas), pero el Scraper ve "Consultar disponibilidad".
- Necesitamos una forma de iterar o "forzar" la vista de stock agregado sin tener que navegar físicamente.

**Pregunta para Agentes:**
¿Cómo simular o interceptar la carga de inventarios geolocalizados en Puppeteer para obtener una suma total de unidades confiable?

### 3. Rendimiento y Timeouts (SPA Pesada)
**El Problema:**
La página de producto tarda mucho en cargar (Resources > 20MB en imágenes/scripts).
- Tuvimos que bloquear imágenes/fuentes agresivamente para evitar Timeouts de 25s.
- Aún así, la navegación `waitUntil: 'domcontentloaded'` a veces se dispara antes de que los datos dinámicos (precio/stock) se hidraten en el cliente.

**Pregunta para Agentes:**
¿Existe una técnica de "Hydration Check" eficiente para Puppeteer que sepa *exactamente* cuando la data crítica (precio/stock) apareció, sin usar `setTimeout` arbitrarios y frágiles?

### 4. Detección Antibot y WAF
- Aunque usamos User-Agents rotativos, la consistencia es un reto. ¿Recomendaciones para mantener la sesión "viva" de forma segura sin ser baneados?

---
*Este documento fue generado para análisis externo y colaboración técnica.*
