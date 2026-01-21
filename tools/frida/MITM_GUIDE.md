# 🕵️ Guía de Interceptación "Ninja" de API Móvil (MITM)

Esta guía detalla cómo interceptar el tráfico HTTPS de la App Android de Farmatodo para descubrir los "endpoints" (puntos de acceso) privados para **Stock**, **Códigos ATC**, y **Detalles de Producto**.

## 🎯 Objetivo
Capturar la respuesta JSON "cruda" que la app recibe cuando ves un producto (ej. "Atamel"). Buscamos campos ocultos como:
- `stock` / `inventory` (Inventario real por tienda)
- `atc_code` (Código ATC)
- `active_ingredient` (Principio Activo)
- `stores` / `branches` (Sucursales con disponibilidad)

## 🛠️ Herramientas del Arsenal
1.  **PC/Mac**: HTTP Toolkit (Recomendado - el más fácil) o Charles Proxy / MITMProxy.
2.  **Dispositivo Android**: 
    - Android 7-10 (Más fácil de vulnerar certificados).
    - O Android 11+ Rooted (Con Magisk + Módulo AlwaysTrustUserCerts).
3.  **APK de Farmatodo**: La versión que ya decompilamos.

## 🚀 Procedimiento de Infiltración (Paso a Paso)

### 1. Preparar la Trampa (HTTP Toolkit)
1.  **Instalar**: Descarga [HTTP Toolkit](https://httptoolkit.com/) en tu PC.
2.  **Conectar**: 
    - Abre HTTP Toolkit.
    - Haz clic en **"Android Device via ADB"**.
    - Conecta tu celular Android por USB (Depuración USB activada).
    - El kit instalará automáticamente la app de "VPN" y el certificado de espionaje.

### 2. Evasión de Seguridad (Vital: Bypass SSL Pinning)
Como **NO tienes Root**, usaremos la **Estrategia del Clon (Emulador)**. Es la más fácil y segura.

#### 🅰️ Opción Recomendada: Usar un Emulador (PC/Mac)
En lugar de tu teléfono real, usaremos un "teléfono virtual" en tu PC que **ya viene rooteado**.

1.  **Descarga**: Instala **LDPlayer 9**, **Nox Player** o **Android Studio Emulator** (imágenes con Google APIs, no Google Play). LDPlayer es ligero y fácil de rootear.
2.  **Activar Root**:
    *   En LDPlayer: Ajustes -> Otros -> Permiso Root -> **Activar**.
3.  **Conectar HTTP Toolkit**:
    *   Abre HTTP Toolkit en tu PC.
    *   Con el emulador abierto, debería detectarlo automáticamente o vía ADB.
    *   HTTP Toolkit inyectará el certificado como "Sistema" automáticamente (magia pura).
4.  **Instalar Farmatodo**: Arrastra el APK de Farmatodo al emulador para instalarla.
5.  **Ejecutar Frida (Si HTTP Toolkit falla)**:
    Si la app dice "Sin conexión", el certificado automático falló o hay SSL Pinning fuerte. Necesitamos Frida.
    
    **Opción A: Script Automático (¡Nuevo!)**
    He creado un script que hace todo el trabajo sucio por ti.
    1.  Abre tu terminal en la carpeta del proyecto.
    2.  Ejecuta: `python setup_frida.py`
    3.  El script detectará tu emulador, descargará el `frida-server` correcto y lo ejecutará.
    4.  Una vez diga "STARTING FRIDA SERVER", ve al paso de "Captura de Tráfico".

    **Opción B: Manual (Solo si el script falla)**
    1.  Descarga `frida-server-x.x.x-android-x86` (o `arm64` según tu emulador) desde [GitHub](https://github.com/frida/frida/releases).
    2.  Renómbralo a `frida-server`.
    3.  Sube el archivo: `adb push frida-server /data/local/tmp/`
    4.  Dale permisos: `adb shell "chmod 755 /data/local/tmp/frida-server"`
    5.  Ejecútalo: `adb shell "/data/local/tmp/frida-server &"`

#### 🅱️ Opción Alternativa: Parchear el APK (Complejo)
Si insistes en usar tu celular físico sin root, tendríamos que modificar el APK para quitarle la seguridad.
*   Esto requiere herramientas avanzadas (`apktool`, `uber-apk-signer`) y a menudo la app deja de funcionar. **No recomendado** si puedes usar un emulador.

### 3. Captura de Tráfico
1.  Abre la **App Farmatodo** en el celular (mientras HTTP Toolkit está grabando).
2.  **Busca** un producto (ej. "Atamel").
3.  **Abre** la ficha del producto (Aquí es donde la magia ocurre).
4.  **Añade al Carrito** (a veces esto fuerza una verificación de stock real).
5.  **Cambia de Ubicación/Tienda** dentro de la app para ver si el stock cambia.

### 4. Análisis de la Presa (Requests)
En HTTP Toolkit, busca peticiones a dominios sospechosos:
- `api.farmatodo.com`
- `gw-backend-ve.farmatodo.com`
- `oracle-services-vzla...`

**Busca respuestas que contengan JSON como este:**
```json
{
  "product_id": "12345",
  "stock_level": 50,
  "atc": "N02BE01",
  "stores": [
     {"id": "VE01", "stock": 10},
     {"id": "VE02", "stock": 5}
  ]
}
```

### 5. Extracción (Exfiltración)
- Haz clic derecho en la petición más prometedora en HTTP Toolkit.
- Selecciona "Save body as file" (Guardar cuerpo como archivo) o copia el comando **cURL**.
- Pega el JSON o el cURL aquí en el chat. Yo ingeniería inversa para crear el scraper final.

## ⚠️ Solución de Problemas
- **App dice "Sin Internet"**: El SSL Pinning te detectó. DEBES usar el script de Frida (Método A) o necesitamos modificar el APK.
- **La App se cierra sola**: Detección Anti-Tamper. Intenta usar "Magisk Hide" para ocultar el root a la app de Farmatodo.
