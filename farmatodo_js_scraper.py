"""
farmatodo_js_scraper.py

SCRAPER CON JAVASCRIPT INJECTION
Usa JavaScript para interactuar con elementos ocultos en el panel de disponibilidad
"""

import asyncio
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, Page, Browser

# Configuración
def load_env():
    env_file = Path('.env.python')
    if env_file.exists():
        content = env_file.read_text(encoding='utf-8', errors='ignore').replace('\x00', '')
        for line in content.splitlines():
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                key, _, value = line.partition('=')
                os.environ[key.strip()] = value.strip().strip('"').strip("'").replace('\x00', '')

load_env()

OUTPUT_DIR = Path('js_scraper_output')
OUTPUT_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s │ %(levelname)-7s │ %(message)s',
    handlers=[
        logging.FileHandler(OUTPUT_DIR / 'scraper.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('JSscraper')

# JavaScript para extraer datos del panel de disponibilidad
EXTRACT_STOCK_JS = """
(() => {
    const results = {
        ciudades: [],
        total_stock: 0,
        raw_text: '',
        debug: []
    };
    
    // Capturar todo el texto de la página
    const allText = document.body.innerText;
    results.raw_text = allText.substring(0, 1000);
    
    // Buscar patrones de stock con "unid"
    const stockRegex = /(\\d+)\\s*unid/gi;
    let match;
    while ((match = stockRegex.exec(allText)) !== null) {
        const stock = parseInt(match[1]);
        // Buscar contexto antes del match
        const startPos = Math.max(0, match.index - 30);
        const context = allText.substring(startPos, match.index).trim();
        
        results.ciudades.push({
            nombre: context.split('\\n').pop().trim() || 'Ubicación',
            stock: stock
        });
        results.total_stock += stock;
    }
    
    // Buscar sección de disponibilidad
    const paneles = document.querySelectorAll('[class*="disponibilidad"], [class*="availability"]');
    results.debug.push('Paneles encontrados: ' + paneles.length);
    
    // Buscar lista de ciudades
    const cityItems = document.querySelectorAll('[class*="city"], [class*="district"], li');
    results.debug.push('Elementos ciudad: ' + cityItems.length);
    
    for (const item of [...cityItems].slice(0, 20)) {
        const text = item.innerText;
        if (text && /\\d+\\s*unid/i.test(text)) {
            const m = text.match(/(\\d+)\\s*unid/i);
            if (m) {
                results.ciudades.push({
                    nombre: text.replace(m[0], '').trim().substring(0, 40),
                    stock: parseInt(m[1])
                });
            }
        }
    }
    
    return results;
})()
"""


@dataclass
class Ciudad:
    nombre: str
    stock: int = 0

@dataclass
class ProductoStock:
    nombre: str
    url: str
    ciudades: List[Ciudad] = field(default_factory=list)
    total_stock: int = 0
    raw_text: str = ""
    fecha_scrape: str = ""
    success: bool = False
    error: str = ""


class FarmatodoJSScraper:
    """Scraper con inyección de JavaScript"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.results: List[ProductoStock] = []
    
    async def init_browser(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        logger.info("🌐 Navegador inicializado")
    
    async def close_browser(self):
        if self.browser:
            await self.browser.close()
    
    async def scrape_product(self, url: str, name: str) -> ProductoStock:
        """Scrapea un producto usando JavaScript"""
        
        result = ProductoStock(
            nombre=name,
            url=url,
            fecha_scrape=datetime.now().isoformat()
        )
        
        logger.info(f"📦 {name[:40]}...")
        
        try:
            context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()
            
            # Navegar
            logger.info(f"   📍 Navegando...")
            await page.goto(url, wait_until='domcontentloaded', timeout=90000)
            
            # Esperar carga inicial
            await page.wait_for_timeout(5000)
            
            # Scroll hacia abajo para cargar el panel de disponibilidad
            logger.info(f"   🔄 Scrolling y esperando panel de disponibilidad...")
            await page.evaluate("window.scrollTo(0, 600)")
            await page.wait_for_timeout(3000)
            
            # Hacer click en "Disponibilidad en Farmatodo" si existe
            try:
                dispo = await page.query_selector('text=Disponibilidad')
                if dispo:
                    await dispo.click()
                    logger.info(f"   ✅ Click en Disponibilidad")
            except:
                pass
            
            # Hacer click en "Todas Las Ciudades" si existe
            try:
                todas = await page.query_selector('text=Todas Las Ciudades')
                if todas:
                    await todas.click()
                    logger.info(f"   ✅ Click en Todas Las Ciudades")
                    await page.wait_for_timeout(2000)
            except:
                pass
            
            # Esperar para que cargue todo el panel (el mapa tarda mucho)
            logger.info(f"   ⏳ Esperando 20s para que cargue el mapa...")
            await page.wait_for_timeout(20000)
            
            # Tomar screenshot
            await page.screenshot(path=str(OUTPUT_DIR / f'{name[:30].replace(" ","_")}.png'), full_page=True)
            logger.info(f"   📸 Screenshot guardado")
            
            # Ejecutar JavaScript para extraer datos
            logger.info(f"   🔧 Ejecutando extracción JavaScript...")
            js_result = await page.evaluate(EXTRACT_STOCK_JS)
            
            if js_result:
                result.raw_text = js_result.get('raw_text', '')[:500]
                
                for c in js_result.get('ciudades', []):
                    result.ciudades.append(Ciudad(
                        nombre=c.get('nombre', 'Desconocido'),
                        stock=c.get('stock', 0)
                    ))
                
                # Eliminar duplicados
                seen = set()
                unique_ciudades = []
                for c in result.ciudades:
                    key = f"{c.nombre}_{c.stock}"
                    if key not in seen:
                        seen.add(key)
                        unique_ciudades.append(c)
                        result.total_stock += c.stock
                
                result.ciudades = unique_ciudades
                result.success = len(result.ciudades) > 0 or result.total_stock > 0
            
            # Si JavaScript no encontró nada, intentar con BeautifulSoup
            if not result.success:
                logger.info(f"   🔄 Intentando con BeautifulSoup...")
                html = await page.content()
                soup = BeautifulSoup(html, 'html.parser')
                text = soup.get_text(' ')
                
                # Buscar patrones de stock
                matches = re.findall(r'(\d+)\s*unid', text, re.I)
                if matches:
                    for i, m in enumerate(matches[:10]):
                        result.ciudades.append(Ciudad(
                            nombre=f"Ubicación {i+1}",
                            stock=int(m)
                        ))
                        result.total_stock += int(m)
                    result.success = True
            
            if result.success:
                logger.info(f"   ✅ {len(result.ciudades)} ubicaciones, {result.total_stock} unidades")
            else:
                logger.warning(f"   ⚠️ No se encontraron datos")
            
            await context.close()
            
        except Exception as e:
            result.error = str(e)
            logger.error(f"   ❌ Error: {e}")
        
        return result
    
    async def run(self, products: List[Dict]) -> List[ProductoStock]:
        """Ejecuta el scraper"""
        
        logger.info(f"\n{'═'*50}")
        logger.info(f"🚀 SCRAPE CON JAVASCRIPT - {len(products)} productos")
        logger.info(f"{'═'*50}\n")
        
        await self.init_browser()
        
        for i, p in enumerate(products, 1):
            logger.info(f"\n[{i}/{len(products)}] {'─'*30}")
            result = await self.scrape_product(p['url'], p['name'])
            self.results.append(result)
            
            if i < len(products):
                await asyncio.sleep(5)
        
        await self.close_browser()
        
        # Resumen
        successful = sum(1 for r in self.results if r.success)
        total = sum(r.total_stock for r in self.results)
        
        logger.info(f"\n{'═'*50}")
        logger.info(f"🏁 COMPLETADO: {successful}/{len(products)} exitosos")
        logger.info(f"📊 Stock total: {total} unidades")
        logger.info(f"{'═'*50}\n")
        
        return self.results
    
    def save_results(self):
        data = []
        for r in self.results:
            data.append({
                "producto": r.nombre,
                "url": r.url,
                "ciudades": [{"nombre": c.nombre, "stock": c.stock} for c in r.ciudades],
                "total_stock": r.total_stock,
                "raw_text": r.raw_text,
                "success": r.success,
                "error": r.error,
                "fecha": r.fecha_scrape
            })
        
        with open(OUTPUT_DIR / 'resultados.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 Resultados: {OUTPUT_DIR}/resultados.json")


async def main():
    # Productos de prueba
    products = [
        {
            "name": "Acetaminofén 650 mg Atamel Forte",
            "url": "https://www.farmatodo.com.ve/producto/111026723-acetaminofen-atamel-forte-650-mg-x-10-tabletas"
        }
    ]
    
    scraper = FarmatodoJSScraper()
    await scraper.run(products)
    scraper.save_results()
    
    # Mostrar resultados
    print("\n" + "="*50)
    print("RESULTADOS")
    print("="*50)
    
    for r in scraper.results:
        print(f"\n📦 {r.nombre}")
        print(f"   ✅ Exitoso: {r.success}")
        print(f"   📊 Total: {r.total_stock} unidades")
        print(f"   🏙️ Ubicaciones: {len(r.ciudades)}")
        for c in r.ciudades[:5]:
            print(f"      - {c.nombre}: {c.stock} unid")
        if r.raw_text:
            print(f"   📝 Texto capturado: {r.raw_text[:200]}...")


if __name__ == "__main__":
    asyncio.run(main())
