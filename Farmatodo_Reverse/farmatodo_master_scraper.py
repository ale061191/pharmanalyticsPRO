"""
🚜 FARMATODO MASTER SCRAPER 🚜
--------------------------------
Este script es una solución robusta para extraer datos de Farmatodo.com.ve.
Usa Playwright para simular un navegador real, lo que permite:
1. Renderizar aplicaciones React/Angular/Vue.
2. Evadir bloqueos básicos de bots.
3. Interactuar con la página (scroll, clicks).

REQUISITOS:
- pip install playwright pandas
- playwright install chromium

USO:
- python farmatodo_master_scraper.py
"""

import asyncio
import random
import pandas as pd
from datetime import datetime
from playwright.async_api import async_playwright

# CONFIGURACIÓN
BASE_URL = "https://www.farmatodo.com.ve/catalogo"
OUTPUT_FILE = "farmatodo_data.csv"
MAX_PAGES = 5  # Cuántas páginas scrapear (ajustar según necesidad)
HEADLESS = True # True para no ver el navegador, False para verlo

async def scrape_farmatodo():
    print(f"🚀 Iniciando Scraper de Farmatodo en {BASE_URL}...")
    
    async with async_playwright() as p:
        # Lanzar navegador con argumentos para parecer humano
        browser = await p.chromium.launch(headless=HEADLESS)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        page = await context.new_page()

        all_products = []

        try:
            # 1. Navegar al catálogo
            print("🌐 Cargando catálogo...")
            await page.goto(BASE_URL, timeout=60000)
            await page.wait_for_load_state("networkidle") # Esperar a que la red se calme

            # Loop por páginas (lógica de paginación)
            for current_page in range(1, MAX_PAGES + 1):
                print(f"📄 Procesando página {current_page}...")
                
                # Scroll progresivo para disparar Lazy Loading de imágenes/datos
                await scroll_dummy(page)

                # Selector de las tarjetas de producto (Este selector debe ajustarse si cambia la web)
                # Buscamos elementos que parezcan tarjetas de producto. 
                # NOTA: Estos selectores son genéricos, inspeccionar la web real para mayor precisión.
                product_cards = await page.locator(".card-product, .product-item, div[class*='product']").all() # Intentamos selectores comunes
                
                # Si no encontramos con selectores genéricos, hay que ser específicos (ejemplo hipotético)
                if not product_cards:
                     # Fallback strategy: Buscar por etiquetas de precio comunes
                     product_cards = await page.locator("text='$', text='Bs'").locator("..").locator("..").all()

                print(f"   -> Encontrados {len(product_cards)} posibles productos.")

                for card in product_cards:
                    try:
                        # Extraer datos (ajustar selectores CSS/XPath según inspección real)
                        text_content = await card.inner_text()
                        lines = text_content.split('\n')
                        
                        # Lógica heurística simple para extraer info del texto crudo
                        product_data = {
                            "raw_text": text_content.replace('\n', ' | '),
                            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "status": "Available" # Asumir disponible a menos que diga "Agotado"
                        }
                        
                        # Detectar agotado
                        if "agotado" in text_content.lower() or "sin stock" in text_content.lower():
                            product_data["status"] = "Out of Stock"

                        # Intentar sacar precio (buscar símbolo de moneda)
                        # ... lógica de parsing de precio aquí ...

                        all_products.append(product_data)
                    except Exception as e:
                        print(f"⚠️ Error parseando tarjeta: {e}")

                # 2. Ir a siguiente página
                # Buscar botón "Siguiente" o "Next"
                # next_btn = page.locator("button:has-text('Siguiente'), a[aria-label='Next']")
                # if await next_btn.is_visible():
                #     await next_btn.click()
                #     await page.wait_for_timeout(3000)
                # else:
                #     print("🛑 No hay más páginas.")
                #     break
                
                # (Para demo, solo esperamos simulando tiempo humano)
                await page.wait_for_timeout(random.randint(2000, 5000))

        except Exception as e:
            print(f"❌ Error fatal: {e}")
        finally:
            await browser.close()

        # Guardar resultados
        if all_products:
            df = pd.DataFrame(all_products)
            df.to_csv(OUTPUT_FILE, index=False)
            print(f"✅ Datos guardados en {OUTPUT_FILE} ({len(df)} productos)")
        else:
            print("⚠️ No se extrajeron datos.")

async def scroll_dummy(page):
    """Simula un usuario haciendo scroll hacia abajo"""
    for _ in range(5):
        await page.mouse.wheel(0, 500)
        await page.wait_for_timeout(random.randint(500, 1000))

if __name__ == "__main__":
    asyncio.run(scrape_farmatodo())
