# 🛡️ Guía de Intercepción Avanzada: Estrategia VPN (Flutter Bypass)

> [!IMPORTANT]
> **¿Por qué hacemos esto?**
> Las aplicaciones modernas creadas con **Flutter** (como Farmatodo) a menudo ignoran la configuración de Proxy WiFi del sistema Android. Además, tienen protección SSL Pinning que hace que la app falle si detecta un certificado extraño.
> 
> Esta técnica usa **Postern** (una app de VPN local) para "obligar" a todo el tráfico a pasar por nuestro proxy (HTTP Toolkit), bypassando la restricción de Flutter.

---

## 🛠️ Herramientas Necesarias
1. **Emulador:** LDPlayer 9 o Nox (Root activado).
2. **HTTP Toolkit:** Instalado en tu PC.
3. **APK de Postern:** [Descargar Postern 3.1.2 de APKPure](https://apkpure.com/postern/com.tunnelworkshop.postern/download) (o busca "Postern APK" en Google si este falla).
4. **Certificado de HTTP Toolkit:** Instalado como "Root CA" en el emulador (ya lo hicimos en pasos anteriores, pero verificaremos).

---

## 🚀 Pasos de Configuración

### 1. Preparar HTTP Toolkit (PC)
1. Abre **HTTP Toolkit**.
2. Selecciona la opción **"Android (via ADB)"**.
3. Deja que HTTP Toolkit configure el dispositivo inicialmente (instalará su app y certificado).
4. **OJO:** Si la app de Farmatodo ignora esta captura (no ves tráfico HTTPS o ves "Tunneling"), procede al paso 2.

### 2. Instalar y Configurar Postern (En el Emulador)
*Postern crea un túnel VPN local que intercepta tráfico a nivel de paquete, incluso si la app no quiere usar proxy.*

1. Instala el APK de **Postern** en el emulador (arrastra y suelta el APK).
2. Abre Postern.
3. Ve a **"Proxy Rules"** -> **"Add Proxy Rule"**:
    - **Rule:** `Match All`
    - **Proxy/Tunnel:** Selecciona el proxy que configuraremos abajo.
    - (Espera, primero configuremos el Proxy).

4. Ve a **"Add Proxy"**:
    - **Name:** `HTTPToolkit`
    - **Address:** `10.0.2.2` (Esta es la IP de tu PC desde el emulador).
    - **Port:** `8000` (Puerto por defecto de HTTP Toolkit, verifica en la app de escritorio la IP y puerto exactos que muestra en "Waiting for connection").
    - **Type:** `HTTPS` o `SOCKS5` (HTTP Toolkit suele funcionar mejor como HTTPS proxy para desencriptar).
    - **Guarda** el proxy.

5. Ahora sí, configura las **Reglas**:
    - Ve a **Rules** -> **Add Rule**.
    - **Match Method:** `Match All`.
    - **Rule:** `Proxy/Tunnel`.
    - **Proxy/Group:** Selecciona el `HTTPToolkit` que creaste.
    - **Guardar**.

6. **Activar VPN:**
    - En el menú lateral de Postern, activa **"VPN Off"** a **"VPN On"**.
    - Acepta el permiso de Android para crear una conexión VPN (aparecerá una llavecita en la barra de estado).

### 3. Ejecutar Farmatodo
1. Abre la app **Farmatodo**.
2. Deberías ver tráfico apareciendo en HTTP Toolkit en tu PC.
3. Busca peticiones a:
    - `oracle-services-vzla.firebaseio.com`
    - `firebaseinstallations.googleapis.com`
    - Cualquier dominio con `api` o `services`.

---

## 🕵️‍♂️ ¿Qué buscamos? (Checklist)
Queremos encontrar una petición que devuelva **JSON** con datos de productos (precio, stock, código ATC).

Filtra en HTTP Toolkit por:
- `atc`
- `stock`
- `precio`
- `get` (método)

### Si la app sigue crasheando (PairIP):
Si la protección "PairIP" detecta la VPN o el Root y cierra la app:
1. Asegúrate de tener **Objection** o **Frida** listos.
2. Usaremos el script de bypass que ya tenemos (`frida-ssl-pinning-script.js`) pero lanzado *antes* de que la app arranque completamente.

```bash
# Comando de ataque combinado (PC)
frida -U -f com.farmatodo.app.ve -l frida-ssl-pinning-script.js --no-pause
```

> **Nota:** La combinación de VPN (Postern) + Frida (Bypass) es la técnica definitiva.
