# PRD: Farmatodo Sales Tracker Pro - Sistema Completo

## Visión General
App web/PWA robusta que scrapea datos públicos multi-canal (sitio Farmatodo, app, redes sociales) para ranking productos, ventas estimadas por uds/día/ciudad/sector, histórico trends y segmentación detallada. Precisión 80-90% inferida de stock depleción + engagement. Para clientes: Insights accionables sin datos privados.[1][2][3]

## Stack Técnico (Obligatorio)
- Frontend: Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Recharts (gráficos), Leaflet (mapas)
- Backend: Next.js API Routes, Supabase (DB realtime, Auth, Storage imgs)
- Scraping: Axios/Cheerio (estático), Puppeteer (dinámico), cron jobs
- Multi-fuente: Instagram/TikTok/FB Graph API (engagement), farmatodo.com.ve/.co/app
- Deploy: Vercel + Supabase + Google Cloud Functions (proxies)
- ML: Vercel AI (forecast ventas)

## Features Completas (Priorizadas MVP → Pro)
1. **Dashboard Principal**: Top 50 ranking (nombre, lab, mg, foto, score ventas). Filtros: Categoría, laboratorio, ciudad.
2. **Detalle Producto**: Foto, lab (ej. Genfar), presentación (400mg), stock multi-tienda/ciudad, uds vendidas/día estimadas.
3. **Mapa Segmentación**: Heatmap sucursales (stock bajo = ventas altas), % depleción por sector/ciudad.
4. **Históricos/Gráficos**: Línea uds ventas vs tiempo (1D/1W/1M), rank evolución, forecast proyecciones.
5. **Multi-Canal Scraping**:
   - Web/App: Stock uds, precios, reseñas, labs, imgs, variantes (ibuprofeno x marca).
   - Redes (IG/TikTok/FB): Top productos por likes/comentarios/views (#Farmatodo).[4][5]
6. **Reports Cliente**: PDF/Export: Precisión metrics (80-90%), proyecciones uds/% market share.
7. **Auth & Alerts**: Supabase Auth, Telegram/email notifs (ej. "Stock bajo Caracas").

## Cálculos Clave (Precisión 80-90%)
- **Score Ranking**: (reseñas*0.3 + depleción_stock*0.4 + engagement_redes*0.2 + precio_bajo*0.1).
- **Ventas uds/día**: stock_anterior - stock_actual + reabastecimiento (detecta picos).[3]
- **% Market/Sector**: ventas_producto / total_scrapeado_categoría *100.
- **Forecast**: ML simple (lineal) proyecciones semanales/mensuales.

## Esquema DB Supabase
```
products: id, name, lab_name, mg_presentation, image_url, category, avg_price
stock_history: product_id, date, stock_total, stock_caracas, uds_vendidas, city
rankings: date, product_id, rank, score
social_engagement: product_name, likes, comments, source (IG/TikTok)
sucursales: id, name, city, lat_lng
```

## User Flows
1. Login → Dashboard top ranking + mapa ventas calientes.
2. Click producto → Detalle completo (foto/lab/stock/gráfico histórico).
3. Filtro "Ibuprofeno Caracas" → Tabla variantes labs + ventas uds/ciudad.
4. Report: "Genera PDF: Posición #3 sector Analgésicos, 25 uds/día Zulia (85% precisión)".

## Tareas Agente Antigravity (Prompt Exacto)
```
Crea app COMPLETA Farmatodo Tracker Pro con este PRD:

1. npx create-next-app@latest --typescript --tailwind --eslint --app
2. Instala: @supabase/supabase-js, cheerio, puppeteer, axios, cron, recharts, leaflet, lucide-react, @hookform/resolvers
3. Supabase: Auth, tables arriba + realtime subscriptions.
4. Scrapers (/api):
   - /scrape-products: Categorías + variantes (labs/mg/img/stock multi-tienda).
   - /scrape-social: IG/TikTok hashtags Farmatodo (top likes).
   - /calc-trends: uds_vendidas, score, forecast.
5. UI:
   - /: Dashboard tabla ranking + mapa Leaflet sucursales.
   - /[productId]: Detalle foto/stock/gráficos (Recharts líneas ventas/rank).
   - /map: Heatmap ventas por ciudad.
   - /reports/[id]: PDF jsPDF con métricas precisión.
6. Cron: Cada 6h scrape → calc → realtime update.
7. Optimizaciones: Proxies rotativos, error handling, mock data dev.
8. Deploy: vercel.json + Supabase env vars.

Código LIMPIO, responsive PWA, tests. Disclaimer precisión en UI.
```

## Legal/Ética y Disclaimer
- Solo públicos (no login/private). Rate-limit, user-agents rotativos.[6]
- Report: "Datos inferidos públicos, precisión 80-90% (stock depleción correlaciona ventas reales farmacias)".[3]
- Sucursales: Lista inicial de Wikipedia + auto-detect scrape.[7]

## Roadmap Post-MVP
- API pagos clientes.
- ML avanzado (Gemini forecasts).
- +Canales: MercadoLibre farmacias.

Copia este PRD.md entero a Antigravity → App full generada/deploy en <30min. ¡Itera "agrega feature X"!