# Sistema de Scraping Pharmanalytics

## Descripción General

Este documento describe el sistema automatizado de extracción de datos de productos de Farmatodo Venezuela, diseñado para mantener sincronizado el catálogo de productos con precios actualizados.

## Archivo Maestro

**Ubicación:** `master/pharmanalytics_sync.js`

Este es el único archivo que necesitas ejecutar para sincronizar todo el catálogo.

### Uso

```bash
# Sincronización completa
node master/pharmanalytics_sync.js

# Solo validar precios
node master/pharmanalytics_sync.js --validate-only

# Preview sin cambios
node master/pharmanalytics_sync.js --dry-run
```

### Características

- ✅ Conexión robusta a Algolia con reintentos
- ✅ Búsqueda por prefijos (a-z, 0-9) para obtener 20K+ productos
- ✅ Normalización de precios (detecta errores x100)
- ✅ Limpieza de nombres (remueve !!, //, Psi)
- ✅ Extracción de marca/laboratorio
- ✅ Cálculo de descuentos
- ✅ Batch upserts a Supabase (100 productos/batch)
- ✅ Logging detallado con timestamps
- ✅ Rate limiting inteligente

## Credenciales de Algolia

```javascript
APP_ID: 'VCOJEYD2PO'
API_KEY: '869a91e98550dd668b8b1dc04bca9011'
INDEX: 'products' (fallback: 'products-vzla')
```

> **Nota:** Estas son credenciales públicas expuestas por Farmatodo en su sitio web.

## Automatización

### Windows Task Scheduler

1. Abrir "Programador de tareas"
2. Crear tarea básica
3. Configurar:
   - **Programa:** `node`
   - **Argumentos:** `master/pharmanalytics_sync.js`
   - **Iniciar en:** `C:\Users\Usuario\Documents\pharmanalytics`
   - **Trigger:** Diario, 2:00 AM

### Linux/Mac (Cron)

```bash
# Editar crontab
crontab -e

# Agregar línea
0 2 * * * cd /path/to/pharmanalytics && node master/pharmanalytics_sync.js >> master/sync.log 2>&1
```

## Seguridad y Anti-Detección

El sistema está diseñado para ser invisible a Farmatodo:

| Característica | Descripción |
|----------------|-------------|
| **API pública** | Usa la misma API key que el sitio web público |
| **Rate limiting** | 50ms de pausa entre batches |
| **Reintentos** | Backoff exponencial en caso de error |
| **Hora óptima** | Ejecución a las 2 AM (bajo tráfico) |
| **Sin browser** | Solo API REST, no usa Playwright |

## Archivos en `master/`

| Archivo | Función |
|---------|---------|
| `pharmanalytics_sync.js` | Script maestro de sincronización |
| `granular_stock_scraper.py` | Scraper de stock por tienda |
| `price_normalizer.js` | Utilidades de normalización |
| `README.md` | Documentación rápida |
| `sync.log` | Logs de ejecución |

## Resultados Típicos

Una ejecución típica sincroniza:
- ~22,000 productos únicos
- ~19,000 precios normalizados
- Tiempo: 4-5 minutos
- Descuentos: 10% a 70%

## Logs

Los logs se guardan automáticamente en `master/sync.log` con formato:

```
[2026-01-17T23:40:39.096Z] [OK   ] SINCRONIZACIÓN COMPLETADA
```

## Troubleshooting

### Error: "Index not allowed"
El índice principal puede cambiar. El script automáticamente prueba índices alternativos.

### Error: "No se encontró índice válido"
Verificar conectividad a internet y que Farmatodo no haya cambiado sus credenciales.

### Precios incorrectos
El script normaliza automáticamente precios x100. Usar `--validate-only` para verificar.
