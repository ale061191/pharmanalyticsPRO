"""
test_hierarchy_stealth.py

Prueba definitiva para extraer la jerarquía completa:
Ciudad → Municipio → Sucursal → Stock

Usa Playwright con modo stealth para evitar detección anti-bot.
"""

import asyncio
import json
import re
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# Intentar importar stealth
try:
    from playwright_stealth import stealth_async
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    print("⚠️ playwright-stealth no instalado. Continuando sin stealth.")

# Configuración
OUTPUT_DIR = Path('test_output')
OUTPUT_DIR.mkdir(exist_ok=True)

# URL de prueba - URL verificada y activa
TEST_URL = "https://www.farmatodo.com.ve/producto/111026723-acetaminofen-atamel-forte-650-mg-x-10-tabletas"


async def run_test():
    """Ejecuta la prueba de extracción de jerarquía"""
    
    print("\n" + "="*60)
    print("🧪 PRUEBA DEFINITIVA - EXTRACCIÓN DE JERARQUÍA")
    print("="*60 + "\n")
    
    async with async_playwright() as p:
        # Lanzar navegador con opciones anti-detección
        print("🌐 Iniciando navegador con modo stealth...")
        
        browser = await p.chromium.launch(
            headless=False,  # Visible para debugging
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-web-security',
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='es-VE',
            timezone_id='America/Caracas',
        )
        
        page = await context.new_page()
        
        # Aplicar stealth si está disponible
        if STEALTH_AVAILABLE:
            await stealth_async(page)
            print("✅ Modo stealth aplicado")
        
        try:
            # Navegar a la página
            print(f"\n📍 Navegando a: {TEST_URL[:50]}...")
            await page.goto(TEST_URL, wait_until='networkidle', timeout=60000)
            
            # Esperar carga inicial
            print("⏳ Esperando carga inicial (10s)...")
            await page.wait_for_timeout(10000)
            
            # Tomar screenshot inicial
            await page.screenshot(path=str(OUTPUT_DIR / '01_pagina_inicial.png'), full_page=True)
            print("📸 Screenshot 1: Página inicial guardada")
            
            # Buscar y hacer click en elementos que parezcan botones de disponibilidad
            print("\n🔍 Buscando elementos de stock/disponibilidad...")
            
            # Diferentes selectores posibles para el panel de stock
            stock_selectors = [
                'text=Disponibilidad',
                'text=Ver disponibilidad',
                'text=Stock',
                '[class*="stock"]',
                '[class*="availability"]',
                'button:has-text("Ver")',
                '.btn-availability',
            ]
            
            clicked = False
            for selector in stock_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        await element.click()
                        print(f"   ✅ Click en: {selector}")
                        await page.wait_for_timeout(3000)
                        clicked = True
                        break
                except Exception as e:
                    pass
            
            if not clicked:
                print("   ⚠️ No se encontró botón de disponibilidad directo")
            
            # Tomar screenshot después de click
            await page.screenshot(path=str(OUTPUT_DIR / '02_despues_click.png'), full_page=True)
            print("📸 Screenshot 2: Después de click")
            
            # Buscar y expandir acordeones de ciudades
            print("\n📂 Buscando acordeones de ciudades...")
            
            accordion_selectors = [
                '.accordion-header',
                '[class*="expand"]',
                '[class*="toggle"]',
                '.city-name',
                '.mat-expansion-panel-header',
                'mat-expansion-panel-header',
            ]
            
            for selector in accordion_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    if elements and len(elements) > 0:
                        print(f"   📂 Encontrados {len(elements)} elementos con selector: {selector}")
                        for i, el in enumerate(elements[:5]):  # Máximo 5
                            try:
                                await el.click()
                                await page.wait_for_timeout(500)
                            except:
                                pass
                except Exception as e:
                    pass
            
            # Esperar expansión
            await page.wait_for_timeout(3000)
            
            # Tomar screenshot final
            await page.screenshot(path=str(OUTPUT_DIR / '03_acordeones_expandidos.png'), full_page=True)
            print("📸 Screenshot 3: Acordeones expandidos")
            
            # Obtener HTML completo
            html = await page.content()
            
            # Guardar HTML para análisis
            with open(OUTPUT_DIR / 'pagina_completa.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print("📄 HTML completo guardado")
            
            # Analizar contenido
            print("\n" + "="*60)
            print("📊 ANÁLISIS DE CONTENIDO")
            print("="*60)
            
            soup = BeautifulSoup(html, 'html.parser')
            full_text = soup.get_text(' ', strip=True)
            
            # Buscar patrones de stock
            stock_pattern = re.findall(r'(\d+)\s*unid', full_text, re.I)
            print(f"\n🔢 Patrones 'X unid' encontrados: {len(stock_pattern)}")
            if stock_pattern:
                print(f"   Valores: {stock_pattern[:10]}...")
            
            # Buscar nombres de ciudades venezolanas
            ciudades = ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 
                       'Barcelona', 'Maturín', 'Puerto Ordaz', 'Lechería', 'Anaco']
            
            ciudades_encontradas = []
            for ciudad in ciudades:
                if ciudad.lower() in full_text.lower():
                    ciudades_encontradas.append(ciudad)
            
            print(f"\n🏙️ Ciudades venezolanas encontradas: {len(ciudades_encontradas)}")
            if ciudades_encontradas:
                print(f"   {ciudades_encontradas}")
            
            # Buscar "Libertador", "Chacao" u otros municipios
            municipios = ['Libertador', 'Chacao', 'Baruta', 'Sucre', 'El Hatillo']
            municipios_encontrados = []
            for mun in municipios:
                if mun.lower() in full_text.lower():
                    municipios_encontrados.append(mun)
            
            print(f"\n🏛️ Municipios encontrados: {len(municipios_encontrados)}")
            if municipios_encontrados:
                print(f"   {municipios_encontrados}")
            
            # Buscar direcciones
            direcciones = re.findall(r'(Av\.|Calle|C\.C\.|Centro Comercial)[^,]{5,50}', full_text, re.I)
            print(f"\n📍 Direcciones encontradas: {len(direcciones)}")
            if direcciones:
                for d in direcciones[:3]:
                    print(f"   - {d}")
            
            # Resultado
            print("\n" + "="*60)
            print("📋 RESULTADO DE LA PRUEBA")
            print("="*60)
            
            success = len(stock_pattern) > 0 and (len(ciudades_encontradas) > 0 or len(municipios_encontrados) > 0)
            
            if success:
                print("\n✅ PRUEBA EXITOSA")
                print("   Se detectaron datos de stock y ubicaciones")
                result = {
                    "success": True,
                    "stock_patterns": len(stock_pattern),
                    "ciudades": ciudades_encontradas,
                    "municipios": municipios_encontrados,
                    "direcciones": len(direcciones),
                    "mensaje": "La extracción de jerarquía es VIABLE"
                }
            else:
                print("\n⚠️ PRUEBA PARCIAL")
                print("   Se necesita más análisis del HTML")
                result = {
                    "success": False,
                    "stock_patterns": len(stock_pattern),
                    "ciudades": ciudades_encontradas,
                    "municipios": municipios_encontrados,
                    "direcciones": len(direcciones),
                    "mensaje": "Se requiere ajuste de selectores"
                }
            
            # Guardar resultado
            with open(OUTPUT_DIR / 'resultado_prueba.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            print(f"\n💾 Resultados guardados en: {OUTPUT_DIR}/")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'), full_page=True)
        
        finally:
            # Cerrar navegador después de 5 segundos
            print("\n⏳ Cerrando navegador en 5 segundos...")
            await asyncio.sleep(5)
            await browser.close()
    
    print("\n" + "="*60)
    print("🏁 PRUEBA FINALIZADA")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_test())
