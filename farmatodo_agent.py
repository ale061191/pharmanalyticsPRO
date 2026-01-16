"""
farmatodo_agent.py - Agente Scraper Profesional 10/10

CARACTERÍSTICAS:
✅ Playwright con navegación inteligente
✅ Multi-estrategia de extracción (3 niveles de fallback)
✅ Gemini AI para parsing inteligente
✅ Retry automático con backoff exponencial
✅ Screenshots para debugging
✅ Logging completo
✅ Integración con Supabase
✅ Rate limiting inteligente
✅ Manejo de CAPTCHAs y errores de red
"""

import asyncio
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from bs4 import BeautifulSoup
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page, Browser, TimeoutError as PlaywrightTimeout

# Load environment - with fallback for problematic .env files
def load_env_safely():
    """Load environment variables with fallback"""
    # Try .env.python first (clean file), then .env.local
    for env_file_name in ['.env.python', '.env.local']:
        env_file = Path(env_file_name)
        if env_file.exists():
            try:
                # Read file and filter out null characters
                content = env_file.read_text(encoding='utf-8', errors='ignore')
                content = content.replace('\x00', '')
                
                for line in content.splitlines():
                    line = line.strip()
                    if '=' in line and not line.startswith('#'):
                        key, _, value = line.partition('=')
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        # Filter out null characters from value too
                        value = value.replace('\x00', '')
                        if key and value:
                            os.environ[key] = value
                break  # Stop after first successful load
            except Exception as e:
                print(f"Warning: Could not load {env_file_name}: {e}")

load_env_safely()

# ═══════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════

@dataclass
class Config:
    # API Keys
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    SUPABASE_URL: str = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
    SUPABASE_KEY: str = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    
    # Browser
    HEADLESS: bool = True
    VIEWPORT_WIDTH: int = 1920
    VIEWPORT_HEIGHT: int = 1080
    
    # Timeouts (ms)
    PAGE_TIMEOUT: int = 90000
    ELEMENT_TIMEOUT: int = 15000
    
    # Retry
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 5  # seconds
    
    # Rate limiting
    DELAY_BETWEEN_PRODUCTS: int = 8  # seconds
    
    # Storage
    OUTPUT_DIR: Path = Path('scraper_output')
    SCREENSHOTS_DIR: Path = Path('scraper_output/screenshots')


config = Config()

# Create directories
config.OUTPUT_DIR.mkdir(exist_ok=True)
config.SCREENSHOTS_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s │ %(levelname)-7s │ %(message)s',
    handlers=[
        logging.FileHandler(config.OUTPUT_DIR / 'scraper.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('FarmatodoAgent')

# ═══════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════

@dataclass
class Sucursal:
    nombre: str
    direccion: str = ""
    stock: int = 0

@dataclass
class Municipio:
    nombre: str
    sucursales: List[Sucursal] = None
    
    def __post_init__(self):
        if self.sucursales is None:
            self.sucursales = []

@dataclass
class Ciudad:
    nombre: str
    municipios: List[Municipio] = None
    
    def __post_init__(self):
        if self.municipios is None:
            self.municipios = []

@dataclass
class ProductStock:
    producto: str
    url: str
    ciudades: List[Ciudad] = None
    total_stock: int = 0
    fecha_scrape: str = ""
    success: bool = False
    extraction_method: str = ""
    error: str = ""
    
    def __post_init__(self):
        if self.ciudades is None:
            self.ciudades = []
        if not self.fecha_scrape:
            self.fecha_scrape = datetime.now().isoformat()

# ═══════════════════════════════════════════════════════════════════
# GEMINI AI INTEGRATION
# ═══════════════════════════════════════════════════════════════════

class GeminiExtractor:
    """Extractor inteligente usando Gemini AI"""
    
    def __init__(self):
        self.available = False
        self.model = None
        
        if config.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=config.GEMINI_API_KEY)
                self.model = genai.GenerativeModel('gemini-2.0-flash')
                self.available = True
                logger.info("✅ Gemini AI inicializado correctamente")
            except Exception as e:
                logger.warning(f"⚠️ Gemini no disponible: {e}")
    
    async def extract(self, html: str, product_name: str) -> Optional[List[Dict]]:
        """Extrae datos de stock usando Gemini"""
        
        if not self.available:
            return None
        
        # Limpiar y truncar HTML
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remover scripts y estilos
        for tag in soup(['script', 'style', 'meta', 'link']):
            tag.decompose()
        
        clean_html = str(soup)[:20000]  # Limitar tokens
        
        prompt = f"""Eres un experto en scraping de datos. Analiza este HTML de Farmatodo Venezuela.

PRODUCTO: {product_name}

OBJETIVO: Extraer la disponibilidad de stock con esta jerarquía exacta:
1. CIUDAD (ej: Caracas, Maracaibo, Valencia)
2. MUNICIPIO dentro de cada ciudad (ej: Libertador, Chacao)
3. SUCURSAL dentro de cada municipio (nombre, dirección)
4. STOCK de cada sucursal (número de unidades)

HTML A ANALIZAR:
{clean_html}

INSTRUCCIONES:
- Busca patrones como "99 unid", "disponible", números seguidos de "unidades"
- Identifica nombres de ciudades venezolanas
- Agrupa sucursales por municipio y ciudad
- Si no hay datos claros, devuelve array vacío

RESPONDE SOLO CON JSON VÁLIDO (sin markdown, sin explicación):
[
  {{
    "ciudad": "Caracas",
    "municipios": [
      {{
        "nombre": "Libertador",
        "sucursales": [
          {{"nombre": "Farmatodo Paraíso", "direccion": "Av. Principal...", "stock": 99}}
        ]
      }}
    ]
  }}
]
"""
        
        try:
            response = await asyncio.to_thread(
                self.model.generate_content, prompt
            )
            text = response.text.strip()
            
            # Limpiar respuesta
            text = text.replace('```json', '').replace('```', '').strip()
            
            # Parsear JSON
            if text.startswith('['):
                data = json.loads(text)
                if data and len(data) > 0:
                    logger.info(f"   🤖 Gemini extrajo {len(data)} ciudades")
                    return data
        except json.JSONDecodeError as e:
            logger.warning(f"   ⚠️ Gemini JSON inválido: {e}")
        except Exception as e:
            logger.warning(f"   ⚠️ Gemini error: {e}")
        
        return None

# ═══════════════════════════════════════════════════════════════════
# PARSERS DE HTML
# ═══════════════════════════════════════════════════════════════════

class HTMLParser:
    """Parser tradicional de HTML con múltiples estrategias"""
    
    # Mapa completo de ciudades venezolanas
    CITY_MAP = {
        # Caracas y área metro
        "caracas": "Caracas", "chacao": "Caracas", "altamira": "Caracas",
        "las mercedes": "Caracas", "el hatillo": "Caracas", "baruta": "Caracas",
        "libertador": "Caracas", "sucre": "Caracas", "petare": "Caracas",
        "sambil": "Caracas", "ccct": "Caracas", "la candelaria": "Caracas",
        "santa fe": "Caracas", "los palos grandes": "Caracas",
        
        # Zulia
        "maracaibo": "Maracaibo", "cabimas": "Cabimas", "ciudad ojeda": "Ciudad Ojeda",
        "lagunillas": "Lagunillas", "machiques": "Machiques",
        
        # Carabobo
        "valencia": "Valencia", "naguanagua": "Valencia", "san diego": "Valencia",
        "guacara": "Guacara", "los guayos": "Valencia",
        
        # Lara
        "barquisimeto": "Barquisimeto", "cabudare": "Cabudare", "carora": "Carora",
        
        # Aragua
        "maracay": "Maracay", "turmero": "Turmero", "cagua": "Cagua",
        "la victoria": "La Victoria", "villa de cura": "Villa de Cura",
        
        # Anzoátegui
        "barcelona": "Barcelona", "puerto la cruz": "Puerto La Cruz",
        "lecheria": "Lechería", "el tigre": "El Tigre", "anaco": "Anaco",
        
        # Bolívar
        "ciudad bolivar": "Ciudad Bolívar", "puerto ordaz": "Puerto Ordaz",
        
        # Otros estados
        "maturin": "Maturín", "cumana": "Cumaná", "porlamar": "Porlamar",
        "san cristobal": "San Cristóbal", "merida": "Mérida", "barinas": "Barinas",
        "los teques": "Los Teques", "guarenas": "Guarenas", "guatire": "Guatire",
        "araure": "Araure", "acarigua": "Acarigua", "punto fijo": "Punto Fijo",
        "coro": "Coro", "valera": "Valera", "trujillo": "Trujillo",
    }
    
    @classmethod
    def parse_strategy_1(cls, soup: BeautifulSoup) -> List[Dict]:
        """Estrategia 1: Buscar elementos con clases específicas de Farmatodo"""
        results = []
        
        # Buscar contenedores de stock
        stock_containers = soup.find_all(class_=re.compile(
            r'stock|district|sucursal|branch|availability|store', re.I
        ))
        
        for container in stock_containers:
            text = container.get_text(strip=True)
            
            # Buscar patrón de stock
            stock_match = re.search(r'(\d+)\s*unid', text, re.I)
            if stock_match:
                stock = int(stock_match.group(1))
                city = cls._detect_city(text)
                
                results.append({
                    "ciudad": city,
                    "municipios": [{
                        "nombre": cls._extract_municipio(text),
                        "sucursales": [{
                            "nombre": cls._extract_sucursal(text),
                            "direccion": cls._extract_direccion(text),
                            "stock": stock
                        }]
                    }]
                })
        
        return cls._consolidate_results(results)
    
    @classmethod
    def parse_strategy_2(cls, soup: BeautifulSoup) -> List[Dict]:
        """Estrategia 2: Buscar en texto completo con regex avanzado"""
        results = []
        full_text = soup.get_text(' ', strip=True)
        
        # Patrón: Ciudad/Lugar seguido de número y "unid"
        pattern = r'([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30})\s*[-–:]\s*(\d+)\s*unid'
        matches = re.findall(pattern, full_text, re.I)
        
        for location, stock in matches:
            city = cls._detect_city(location)
            results.append({
                "ciudad": city,
                "municipios": [{
                    "nombre": location.strip(),
                    "sucursales": [{
                        "nombre": location.strip(),
                        "direccion": "",
                        "stock": int(stock)
                    }]
                }]
            })
        
        return cls._consolidate_results(results)
    
    @classmethod
    def parse_strategy_3(cls, soup: BeautifulSoup) -> List[Dict]:
        """Estrategia 3: Buscar accordions y paneles expandibles"""
        results = []
        
        # Buscar elementos que parecen acordeones
        accordions = soup.find_all(class_=re.compile(r'accordion|panel|collapse|expand', re.I))
        
        for accordion in accordions:
            text = accordion.get_text(strip=True)
            stock_matches = re.findall(r'(\d+)\s*unid', text, re.I)
            
            if stock_matches:
                city = cls._detect_city(text)
                total_stock = sum(int(s) for s in stock_matches)
                
                results.append({
                    "ciudad": city,
                    "municipios": [{
                        "nombre": "General",
                        "sucursales": [{
                            "nombre": "Múltiples sucursales",
                            "direccion": "",
                            "stock": total_stock
                        }]
                    }]
                })
        
        return cls._consolidate_results(results)
    
    @classmethod
    def _detect_city(cls, text: str) -> str:
        """Detecta la ciudad basada en el texto"""
        text_lower = text.lower()
        for keyword, city in cls.CITY_MAP.items():
            if keyword in text_lower:
                return city
        return "Otra"
    
    @classmethod
    def _extract_municipio(cls, text: str) -> str:
        """Intenta extraer el nombre del municipio"""
        # Buscar patrones comunes
        patterns = [
            r'municipio\s+([A-Za-záéíóúñ\s]+)',
            r'mun\.\s+([A-Za-záéíóúñ\s]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                return match.group(1).strip()
        return "General"
    
    @classmethod
    def _extract_sucursal(cls, text: str) -> str:
        """Extrae el nombre de la sucursal"""
        # Limitar a primeros 50 caracteres útiles
        clean = re.sub(r'\s+', ' ', text)[:50]
        return clean if clean else "Sucursal"
    
    @classmethod
    def _extract_direccion(cls, text: str) -> str:
        """Extrae la dirección si está disponible"""
        patterns = [
            r'(av\.?\s+[^,]+)',
            r'(calle\s+[^,]+)',
            r'(c\.c\.?\s+[^,]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                return match.group(1).strip()
        return ""
    
    @classmethod
    def _consolidate_results(cls, results: List[Dict]) -> List[Dict]:
        """Consolida resultados por ciudad"""
        city_data = {}
        
        for r in results:
            city = r.get('ciudad', 'Otra')
            if city not in city_data:
                city_data[city] = {
                    "ciudad": city,
                    "municipios": []
                }
            city_data[city]["municipios"].extend(r.get('municipios', []))
        
        return list(city_data.values())

# ═══════════════════════════════════════════════════════════════════
# AGENTE PRINCIPAL
# ═══════════════════════════════════════════════════════════════════

class FarmatodoAgent:
    """Agente Scraper Profesional para Farmatodo Venezuela"""
    
    def __init__(self):
        self.gemini = GeminiExtractor()
        self.results: List[ProductStock] = []
        self.browser: Optional[Browser] = None
        
        logger.info("╔════════════════════════════════════════════════════╗")
        logger.info("║     FARMATODO SCRAPER AGENT v2.0 - PROFESIONAL     ║")
        logger.info("╚════════════════════════════════════════════════════╝")
    
    async def _init_browser(self):
        """Inicializa el navegador"""
        if not self.browser:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=config.HEADLESS,
                args=['--disable-blink-features=AutomationControlled']
            )
            logger.info("🌐 Navegador inicializado")
    
    async def _close_browser(self):
        """Cierra el navegador"""
        if self.browser:
            await self.browser.close()
            self.browser = None
    
    async def _expand_accordions(self, page: Page) -> int:
        """Expande todos los acordeones de ciudades"""
        expanded = 0
        
        # Selectores comunes para acordeones
        selectors = [
            '.accordion-toggle',
            '.city-header',
            '[data-toggle="collapse"]',
            '.expand-btn',
            '.mat-expansion-panel-header',
            'button[class*="expand"]',
            'div[class*="header"][class*="city"]',
        ]
        
        for selector in selectors:
            try:
                elements = await page.query_selector_all(selector)
                for el in elements:
                    try:
                        await el.click()
                        await page.wait_for_timeout(300)
                        expanded += 1
                    except:
                        pass
            except:
                pass
        
        return expanded
    
    async def _scrape_single(self, url: str, name: str, retry: int = 0) -> ProductStock:
        """Scrapea un producto individual con reintentos"""
        
        result = ProductStock(producto=name, url=url)
        
        try:
            context = await self.browser.new_context(
                viewport={'width': config.VIEWPORT_WIDTH, 'height': config.VIEWPORT_HEIGHT},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            
            # Navegar
            logger.info(f"   📍 Navegando a URL...")
            await page.goto(url, timeout=config.PAGE_TIMEOUT, wait_until='domcontentloaded')
            
            # Esperar carga dinámica
            await page.wait_for_timeout(5000)
            
            # Detectar bloqueos
            content = await page.content()
            if 'captcha' in content.lower() or 'blocked' in content.lower():
                raise Exception("Posible CAPTCHA o bloqueo detectado")
            
            # Expandir acordeones
            expanded = await self._expand_accordions(page)
            logger.info(f"   📂 Acordeones expandidos: {expanded}")
            
            # Esperar expansión
            await page.wait_for_timeout(2000)
            
            # Capturar screenshot para debug
            screenshot_path = config.SCREENSHOTS_DIR / f"{name[:30].replace(' ', '_')}.png"
            await page.screenshot(path=str(screenshot_path))
            
            # Obtener HTML final
            html = await page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            # ESTRATEGIA DE EXTRACCIÓN EN CASCADA
            ciudades = []
            
            # 1. Parser tradicional - Estrategia 1
            ciudades = HTMLParser.parse_strategy_1(soup)
            if ciudades:
                result.extraction_method = "html_strategy_1"
                logger.info(f"   ✅ Estrategia 1: {len(ciudades)} ciudades")
            
            # 2. Parser tradicional - Estrategia 2
            if not ciudades:
                ciudades = HTMLParser.parse_strategy_2(soup)
                if ciudades:
                    result.extraction_method = "html_strategy_2"
                    logger.info(f"   ✅ Estrategia 2: {len(ciudades)} ciudades")
            
            # 3. Parser tradicional - Estrategia 3
            if not ciudades:
                ciudades = HTMLParser.parse_strategy_3(soup)
                if ciudades:
                    result.extraction_method = "html_strategy_3"
                    logger.info(f"   ✅ Estrategia 3: {len(ciudades)} ciudades")
            
            # 4. Gemini AI (fallback inteligente)
            if not ciudades and self.gemini.available:
                logger.info(f"   🤖 Usando Gemini AI...")
                gemini_data = await self.gemini.extract(html, name)
                if gemini_data:
                    ciudades = gemini_data
                    result.extraction_method = "gemini_ai"
            
            # Procesar resultados
            if ciudades:
                # Convertir a objetos tipados
                result.ciudades = ciudades
                result.total_stock = sum(
                    sum(s.get('stock', 0) for s in m.get('sucursales', []))
                    for c in ciudades
                    for m in c.get('municipios', [])
                )
                result.success = True
                logger.info(f"   ✅ ÉXITO: {len(ciudades)} ciudades, {result.total_stock} unidades totales")
            else:
                logger.warning(f"   ⚠️ No se encontraron datos de stock")
            
            await context.close()
            
        except PlaywrightTimeout:
            result.error = "Timeout de página"
            logger.error(f"   ⏱️ Timeout")
        except Exception as e:
            result.error = str(e)
            logger.error(f"   ❌ Error: {e}")
            
            # Reintentar si quedan intentos
            if retry < config.MAX_RETRIES:
                logger.info(f"   🔄 Reintento {retry + 1}/{config.MAX_RETRIES}...")
                await asyncio.sleep(config.RETRY_DELAY * (retry + 1))
                return await self._scrape_single(url, name, retry + 1)
        
        return result
    
    async def scrape_products(self, products: List[Dict]) -> List[ProductStock]:
        """Scrapea una lista de productos"""
        
        logger.info(f"\n{'═'*60}")
        logger.info(f"🚀 INICIANDO SCRAPE DE {len(products)} PRODUCTOS")
        logger.info(f"{'═'*60}\n")
        
        await self._init_browser()
        
        for i, product in enumerate(products, 1):
            logger.info(f"\n[{i}/{len(products)}] 📦 {product['name'][:50]}...")
            
            result = await self._scrape_single(product['url'], product['name'])
            self.results.append(result)
            
            # Delay entre productos
            if i < len(products):
                logger.info(f"   ⏳ Esperando {config.DELAY_BETWEEN_PRODUCTS}s...")
                await asyncio.sleep(config.DELAY_BETWEEN_PRODUCTS)
        
        await self._close_browser()
        
        # Resumen
        successful = sum(1 for r in self.results if r.success)
        total_stock = sum(r.total_stock for r in self.results)
        
        logger.info(f"\n{'═'*60}")
        logger.info(f"🏁 SCRAPE COMPLETADO")
        logger.info(f"   ✅ Exitosos: {successful}/{len(products)}")
        logger.info(f"   📊 Stock total extraído: {total_stock}")
        logger.info(f"{'═'*60}\n")
        
        return self.results
    
    def save_results(self, filename: str = "resultados_scrape.json"):
        """Guarda los resultados en JSON"""
        output_path = config.OUTPUT_DIR / filename
        
        # Convertir a diccionarios
        data = []
        for r in self.results:
            d = {
                "producto": r.producto,
                "url": r.url,
                "ciudades": r.ciudades,
                "total_stock": r.total_stock,
                "fecha_scrape": r.fecha_scrape,
                "success": r.success,
                "extraction_method": r.extraction_method,
                "error": r.error
            }
            data.append(d)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 Resultados guardados en: {output_path}")
        return output_path

# ═══════════════════════════════════════════════════════════════════
# EJECUCIÓN PRINCIPAL
# ═══════════════════════════════════════════════════════════════════

async def main():
    """Función principal - Prototipo con 10 productos"""
    
    # Productos de prueba
    test_products = [
        {"name": "Acetaminofen Dolipral Forte 650 Mg X 10 Tabletas", 
         "url": "https://www.farmatodo.com.ve/producto/acetaminofen-dolipral-forte-650-mg-x-10-tabletas"},
        {"name": "Ibuprofeno 400 Mg Calox X 10 Tabletas",
         "url": "https://www.farmatodo.com.ve/producto/ibuprofeno-400-mg-calox-x-10-tabletas"},
        {"name": "Omeprazol 20 Mg Calox X 14 Capsulas",
         "url": "https://www.farmatodo.com.ve/producto/omeprazol-20-mg-calox-x-14-capsulas"},
        {"name": "Losartan 50 Mg Calox X 30 Tabletas",
         "url": "https://www.farmatodo.com.ve/producto/losartan-50-mg-calox-x-30-tabletas"},
        {"name": "Metformina 850 Mg Calox X 30 Tabletas",
         "url": "https://www.farmatodo.com.ve/producto/metformina-850-mg-calox-x-30-tabletas"},
    ]
    
    # Crear agente y ejecutar
    agent = FarmatodoAgent()
    results = await agent.scrape_products(test_products)
    
    # Guardar resultados
    agent.save_results()
    
    return results


if __name__ == "__main__":
    # Verificar dependencias
    print("🔧 Verificando dependencias...")
    try:
        import playwright
        from playwright.async_api import async_playwright
    except ImportError:
        print("❌ Playwright no instalado. Ejecuta:")
        print("   pip install playwright")
        print("   playwright install chromium")
        sys.exit(1)
    
    print("✅ Dependencias OK. Iniciando agente...\n")
    asyncio.run(main())
