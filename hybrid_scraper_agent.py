"""
hybrid_scraper_agent.py

Agente Scraper Híbrido para Farmatodo Venezuela
Extrae: Ciudad → Municipio → Sucursal → Stock

Componentes:
- Playwright: Navegación y expansión de acordeones
- BeautifulSoup: Parsing de HTML
- Gemini: Fallback inteligente para parsing difícil
"""

import asyncio
import json
import os
import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page

# Load environment variables
load_dotenv('.env.local')

# Try to import Gemini (optional for fallback)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini not available. Install with: pip install google-generativeai")

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
HEADLESS = True  # Set to False to see browser actions
TIMEOUT = 60000  # 60 seconds

# Initialize Gemini if available
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')


class FarmatodoScraper:
    """Agente scraper híbrido para Farmatodo"""
    
    def __init__(self):
        self.results = []
        self.errors = []
    
    async def expand_all_cities(self, page: Page) -> bool:
        """Expande todos los acordeones de ciudades en la página"""
        try:
            # Wait for the stock panel to be visible
            await page.wait_for_selector('.stock-panel, .availability-panel, [class*="stock"]', 
                                         timeout=10000)
            
            # Find and click all city accordion headers
            city_headers = await page.query_selector_all(
                '.city-header, .accordion-header, [class*="expand"], [class*="toggle"]'
            )
            
            for header in city_headers:
                try:
                    await header.click()
                    await page.wait_for_timeout(500)  # Wait for animation
                except:
                    pass
            
            return True
        except Exception as e:
            print(f"   ⚠️ Could not expand cities: {e}")
            return False
    
    async def extract_stock_data(self, page: Page, product_name: str) -> dict:
        """Extrae datos de stock de la página actual"""
        
        # Get full HTML of the page
        html = await page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        result = {
            "producto": product_name,
            "fecha_scrape": datetime.now().isoformat(),
            "ciudades": [],
            "total_stock": 0,
            "success": False
        }
        
        # Strategy 1: Look for structured stock elements
        stock_data = self._parse_stock_html(soup)
        
        if stock_data and len(stock_data) > 0:
            result["ciudades"] = stock_data
            result["total_stock"] = sum(
                sum(m.get("stock", 0) for m in c.get("municipios", []))
                for c in stock_data
            )
            result["success"] = True
            return result
        
        # Strategy 2: Use Gemini AI for intelligent extraction
        if GEMINI_AVAILABLE and GEMINI_API_KEY:
            stock_data = await self._gemini_extract(html, product_name)
            if stock_data:
                result["ciudades"] = stock_data
                result["total_stock"] = sum(
                    sum(s.get("stock", 0) for s in m.get("sucursales", []))
                    for c in stock_data
                    for m in c.get("municipios", [])
                )
                result["success"] = True
                result["extraction_method"] = "gemini"
        
        return result
    
    def _parse_stock_html(self, soup: BeautifulSoup) -> list:
        """Parsing tradicional de HTML para extraer jerarquía de stock"""
        cities = []
        
        # Look for common patterns in Farmatodo's HTML
        # Pattern 1: Text containing city names and stock counts
        stock_text = soup.get_text()
        
        # Find patterns like "99 unid" or "145 unidades"
        stock_pattern = r'(\d+)\s*unid'
        matches = re.findall(stock_pattern, stock_text, re.IGNORECASE)
        
        if matches:
            # Found stock numbers, try to associate with locations
            # Look for location containers
            location_elements = soup.find_all(class_=re.compile(r'district|location|branch|sucursal|city'))
            
            for elem in location_elements[:10]:  # Limit to first 10
                text = elem.get_text(strip=True)
                stock_match = re.search(r'(\d+)\s*unid', text, re.IGNORECASE)
                if stock_match:
                    cities.append({
                        "ciudad": self._infer_city(text),
                        "municipios": [{
                            "nombre": text[:50],
                            "sucursales": [{
                                "nombre": text[:30],
                                "stock": int(stock_match.group(1))
                            }]
                        }]
                    })
        
        return cities
    
    def _infer_city(self, text: str) -> str:
        """Infiere la ciudad basada en el texto"""
        text_lower = text.lower()
        city_keywords = {
            "caracas": ["caracas", "chacao", "altamira", "sambil", "libertador", "baruta"],
            "maracaibo": ["maracaibo", "zulia"],
            "valencia": ["valencia", "carabobo"],
            "barquisimeto": ["barquisimeto", "lara"],
            "maracay": ["maracay", "aragua"],
        }
        
        for city, keywords in city_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return city.title()
        
        return "Otra"
    
    async def _gemini_extract(self, html: str, product_name: str) -> Optional[list]:
        """Usa Gemini para extraer datos de stock de HTML complejo"""
        
        # Truncate HTML to avoid token limits
        html_sample = html[:15000]
        
        prompt = f"""
Analiza este HTML de una página de producto de Farmatodo Venezuela.
Producto: {product_name}

Extrae la información de disponibilidad de stock con esta estructura:
- Ciudad (ej: Caracas, Maracaibo)
  - Municipio (ej: Libertador, Chacao)
    - Sucursal (nombre y dirección)
      - Stock (número de unidades)

HTML:
{html_sample}

Responde SOLO con un JSON válido con esta estructura:
[
  {{
    "ciudad": "Nombre Ciudad",
    "municipios": [
      {{
        "nombre": "Nombre Municipio",
        "sucursales": [
          {{"nombre": "Nombre Sucursal", "direccion": "Dirección", "stock": 99}}
        ]
      }}
    ]
  }}
]

Si no encuentras datos de stock, responde: []
"""
        
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            
            # Extract JSON from response
            if text.startswith('['):
                return json.loads(text)
            else:
                # Try to find JSON in the response
                json_match = re.search(r'\[[\s\S]*\]', text)
                if json_match:
                    return json.loads(json_match.group())
        except Exception as e:
            print(f"   ⚠️ Gemini extraction failed: {e}")
        
        return None
    
    async def scrape_product(self, url: str, product_name: str) -> dict:
        """Scrapea un producto específico"""
        
        print(f"🔍 Scraping: {product_name[:50]}...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=HEADLESS)
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()
            
            try:
                # Navigate to product page
                await page.goto(url, timeout=TIMEOUT, wait_until='networkidle')
                
                # Wait for dynamic content
                await page.wait_for_timeout(3000)
                
                # Try to expand all city accordions
                await self.expand_all_cities(page)
                
                # Wait for expanded content
                await page.wait_for_timeout(2000)
                
                # Extract stock data
                result = await self.extract_stock_data(page, product_name)
                
                if result["success"]:
                    print(f"   ✅ Found {len(result['ciudades'])} cities, {result['total_stock']} total units")
                else:
                    print(f"   ⚠️ No stock data extracted")
                
                return result
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
                return {
                    "producto": product_name,
                    "error": str(e),
                    "success": False
                }
            
            finally:
                await browser.close()
    
    async def run_batch(self, products: list) -> list:
        """Ejecuta el scraper en un lote de productos"""
        
        print(f"\n{'='*50}")
        print(f"🚀 INICIANDO SCRAPE DE {len(products)} PRODUCTOS")
        print(f"{'='*50}\n")
        
        results = []
        
        for i, product in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}] ", end="")
            result = await self.scrape_product(product['url'], product['name'])
            results.append(result)
            
            # Delay between requests to avoid rate limiting
            if i < len(products):
                print("   ⏳ Waiting 5 seconds before next request...")
                await asyncio.sleep(5)
        
        # Summary
        successful = sum(1 for r in results if r.get('success'))
        print(f"\n{'='*50}")
        print(f"🏁 SCRAPE COMPLETADO")
        print(f"   ✅ Exitosos: {successful}/{len(products)}")
        print(f"   ❌ Fallidos: {len(products) - successful}/{len(products)}")
        print(f"{'='*50}\n")
        
        return results


async def main():
    """Función principal para prueba de prototipo"""
    
    # Test products (10 samples)
    test_products = [
        {"name": "Acetaminofen Dolipral Forte 650 Mg X 10 Tabletas", 
         "url": "https://www.farmatodo.com.ve/producto/acetaminofen-dolipral-forte-650-mg-x-10-tabletas"},
        {"name": "Ibuprofeno 400 Mg Calox X 10 Tabletas",
         "url": "https://www.farmatodo.com.ve/producto/ibuprofeno-400-mg-calox-x-10-tabletas"},
        {"name": "Omeprazol 20 Mg Calox X 14 Capsulas",
         "url": "https://www.farmatodo.com.ve/producto/omeprazol-20-mg-calox-x-14-capsulas"},
    ]
    
    scraper = FarmatodoScraper()
    results = await scraper.run_batch(test_products)
    
    # Save results
    with open('scraper_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print("📁 Resultados guardados en scraper_results.json")
    
    return results


if __name__ == "__main__":
    asyncio.run(main())
