# Guía de Interpretación de Métricas: Tablero de Inteligencia de Mercado

Este documento detalla los Indicadores Clave de Desempeño (KPIs) visualizados en la plataforma **Pharmanalytics**. Estas métricas han sido diseñadas para ofrecer una visión 360° del estado de inventario y desempeño de mercado de cada producto farmacéutico en tiempo real.

---

## 1. Evolución de Mercado (Gráfico de Tendencia)

### ¿Qué es?
Es una representación gráfica lineal del comportamiento del inventario consolidado en los últimos 30 días.

### ¿Cómo se lee?
*   **Línea Descendente (Pendiente Negativa):** Indica consumo activo. Cuanto más pronunciada es la inclinación, mayor es la velocidad de venta diaria.
*   **Pico Vertical (Salto Positivo):** Representa una **reposición de inventario** (restock) por parte de la cadena.
*   **Línea Plana:** Indica estancamiento (ventas cero) o inventario agotado sostenido.

### Valor Estratégico
Permite detectar **ciclos de reposición** y patrones de demanda estacional. Ayuda a responder no solo "¿cuánto hay?", sino "¿cómo se está comportando el producto a lo largo del tiempo?".

---

## 2. Cobertura Nacional (Gauge / Medidor)

### ¿Qué es?
Mide la **profundidad de distribución** del producto a nivel nacional. Calcula el porcentaje de tiendas que reportan stock positivo (mayor a 0) sobre el total del universo de tiendas monitoreadas.

*   **Fórmula:** `(Tiendas con Stock / Total Tiendas [204]) * 100`

### ¿Cómo se lee?
*   **Alta (> 80%):** Producto "Core" o básico. Excelente distribución logística.
*   **Media (40% - 79%):** Distribución selectiva o problemas logísticos puntuales en ciertas regiones.
*   **Baja (< 40%):** Alerta crítica. Puede indicar una falla de abastecimiento masiva, un producto descontinuado, o un producto de nicho muy específico.

### Valor Estratégico
Es el indicador principal de disponibilidad. Un stock total alto con baja cobertura indica **mala distribución** (mucho producto en pocas tiendas), lo cual es ineficiente. El objetivo es maximizar este porcentaje.

---

## 3. Rotación Estimada (Forecast de Inventario)

### ¿Qué es?
Una proyección predictiva que estima la **durabilidad del inventario actual** en días, basada en el volumen disponible y la velocidad de salida histórica.

### ¿Cómo se lee?
*   **< 15 días (Crítico):** El inventario actual es insuficiente para cubrir la demanda del próximo ciclo. **Acción requerida:** Gestionar reposición inmediata para evitar quiebre de stock (Out of Stock).
*   **15 - 30 días (Alerta):** Nivel de advertencia. Se debe monitorear la reposición.
*   **30 - 45 días (Saludable):** Nivel óptimo. Hay suficiente inventario para operar sin incurrir en costos de sobre-almacenamiento.
*   **> 45 días (Lento):** Posible sobre-stock. El capital está inmovilizado en inventario que no rota.

### Valor Estratégico
Permite anticiparse a los quiebres de stock antes de que ocurran, optimizando el ciclo de flujo de caja y asegurando la disponibilidad continua para el paciente.

---

## 4. Velocidad de Venta

### ¿Qué es?
Un indicador cualitativo de la "temperatura" del producto en el mercado. Relaciona el volumen total de stock con la demanda percibida.

### ¿Cómo se lee?
*   **🔥 Alta:** El producto "vuela" de los anaqueles. Generalmente asociado a inventarios totales bajos (< 50 unidades nacionales) que se consumen rápidamente. Alta rotación.
*   **⚡ Media:** Equilibrio entre oferta y demanda. Flujo constante de ventas.
*   **🧊 Baja:** Producto con movimiento lento o inventario acumulado (> 500 unidades nacionales) que tarda en liquidarse.

### Valor Estratégico
Ayuda a priorizar esfuerzos de marketing o logística.
*   **Alta Velocidad + Baja Cobertura:** Oportunidad de oro perdida (Demanda insatisfecha).
*   **Baja Velocidad + Alta Cobertura:** Producto "hueso" (Sobre-expuesto y sin venta).

---

## Resumen Ejecutivo para Toma de Decisiones

| Indicador | Pregunta que responde | Decisión de Negocio |
| :--- | :--- | :--- |
| **Evolución** | ¿Cuál es la tendencia? | Ajustar proyecciones de compra. |
| **Cobertura** | ¿Dónde está el producto? | Optimizar logística y distribución geográfica. |
| **Rotación** | ¿Cuándo se acaba? | Activar alertas de reorden / compra. |
| **Velocidad** | ¿Qué tan rápido se vende? | Evaluar promociones (si es baja) o urgencia (si es alta). |
