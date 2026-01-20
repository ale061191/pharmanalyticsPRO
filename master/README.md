# 📁 Carpeta Master - Archivos Principales de Pharmanalytics

Esta carpeta contiene los **archivos maestro** del sistema de scraping y sincronización.

## 📋 Archivos Incluidos

| Archivo | Función | Uso |
|---------|---------|-----|
| `pharmanalytics_sync.js` | **MAESTRO**: Sincroniza catálogo completo desde Algolia → Supabase | `node master/pharmanalytics_sync.js` |
| `granular_stock_scraper.py` | Scraper de stock por tienda individual | `python master/granular_stock_scraper.py` |
| `price_normalizer.js` | Utilidades de normalización de precios | Importar desde otros scripts |

## 🚀 Uso Rápido

### Sincronización Completa
```bash
cd pharmanalytics
node master/pharmanalytics_sync.js
```

### Solo Validar Precios
```bash
node master/pharmanalytics_sync.js --validate-only
```

### Preview Sin Cambios
```bash
node master/pharmanalytics_sync.js --dry-run
```

## ⏰ Automatización (Cron 2 AM)

### Windows Task Scheduler
1. Programa: `node`
2. Argumentos: `master/pharmanalytics_sync.js`
3. Iniciar en: `C:\Users\Usuario\Documents\pharmanalytics`
4. Trigger: Diario, 2:00 AM

### Linux/Mac
```bash
0 2 * * * cd /path/to/pharmanalytics && node master/pharmanalytics_sync.js >> master/sync.log 2>&1
```

## 📊 Logs

Los logs se guardan en `master/sync.log`
