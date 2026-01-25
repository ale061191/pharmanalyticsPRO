# Análisis de Viabilidad Técnica y Legal: Arquitectura Pharmanalytics

Este documento detalla la naturaleza técnica de la extracción de datos en **Pharmanalytics** y explica por qué su arquitectura actual es segura, legal y sostenible a largo plazo, diferenciándola de técnicas invasivas como el "Web Scraping" tradicional.

---

## 1. Arquitectura: Consumo de API vs. Web Scraping

Es fundamental distinguir metodológicamente cómo opera nuestro sistema en comparación con bots de extracción convencionales.

### ❌ Web Scraping Tradicional (Lo que NO hacemos)
*   **Método:** Simula ser un humano navegando. Descarga el código visual (HTML/DOM) de la página web completa.
*   **Proceso:** Rompe la estructura visual para encontrar textos escondidos.
*   **Riesgos:**
    *   **Fragilidad:** Si Farmatodo cambia el color de un botón o el nombre de una clase CSS, el robot se rompe.
    *   **Sobrecarga:** Carga imágenes, estilos y scripts innecesarios, consumiendo ancho de banda del servidor objetivo.
    *   **Bloqueo:** Es fácil de detectar y bloquear por los firewalls de seguridad.

### ✅ Consumo de API Pública (Lo que SÍ hacemos)
*   **Método:** Comunicación directa máquina-a-máquina utilizando protocolos estándar (HTTPS/JSON).
*   **Proceso:** Nuestro sistema utiliza las credenciales públicas de lectura (`Application ID` y `API Key`) que Farmatodo expone oficialmente para permitir la búsqueda en su sitio web.
*   **Ventajas:**
    *   **Solicitud Autorizada:** Enviamos una credencial válida en cada petición. El servidor reconoce la solicitud como legítima.
    *   **Eficiencia:** Solo pedimos el dato puro (texto), sin imágenes ni diseño. El impacto en el servidor es ínfimo (kilobytes vs megabytes).
    *   **Robustez:** No dependemos de cambios visuales en la web. Mientras Farmatodo use Algolia como su buscador, nuestro sistema funcionará.

---

## 2. Contexto Legal y Compliance

Basado en precedentes de la industria tecnológica (ej. *hiQ Labs vs. LinkedIn*) y prácticas estándar de Inteligencia Competitiva:

### A. Información de Dominio Público
La información procesada por Pharmanalytics (Nombre del producto, Precio, Existencia en Stock) es **información pública comercial**.
*   No requiere contraseña para visualizarse.
*   No contiene datos personales (PII) de clientes o empleados.
*   Es data que el comercio *publica intencionalmente* para ser vista y consumida.

La jurisprudencia actual tiende a proteger el acceso automatizado a datos que son manifiestamente públicos, siempre que no se violen barreras de autenticación.

### B. Sin Violación de Seguridad ("Hacking")
En ningún momento el sistema evade mecanismos de seguridad, rompe contraseñas o explota vulnerabilidades.
*   Se utilizan **puertas de acceso públicas** (Endpoints de Algolia).
*   Se utilizan **llaves de acceso públicas** (Keys de cliente, visibles en el código fuente de cualquier navegador).

---

## 3. Conclusión para Socios e Inversores

El sistema Pharmanalytics está construido sobre una arquitectura moderna y ética.

1.  **Sostenibilidad:** Al no depender de "trucos" para extraer la data, el mantenimiento técnico es bajo.
2.  **Seguridad:** No se expone la IP del servidor a listas negras por comportamiento abusivo debido a la naturaleza ligera de las consultas.
3.  **Valor Estratégico:** Obtenemos la misma calidad de datos (Tiempo Real) que el equipo interno de la competencia, permitiendo tomar decisiones de mercado basadas en la realidad exacta del inventario nacional.

**Estado del Sistema:** `OPERATIVO` | `BAJO RIESGO` | `ALTA FIDELIDAD`
