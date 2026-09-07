# App de Capacitaciones SST

App web para gestionar capacitaciones de Seguridad y Salud en el Trabajo: el administrador crea
una sesión con contenido y un quiz de 5 preguntas; los asistentes acceden desde su celular por
QR/link, ven el contenido, aprueban el quiz, llenan sus datos y firman en pantalla. Todo se
consolida en un registro exportable a Excel con el formato `FT-SST-02` de la empresa (el mismo
archivo `G-TH-SST 9.00 Registro de Asistencia a Capacitación.xlsx` que está en esta carpeta).

## Stack

- **Backend**: Node.js + Express + `node:sqlite` (el módulo SQLite nativo incluido en Node desde
  la versión 22, sin dependencias que compilar). ExcelJS para exportación, Multer para subida de
  PDF/imágenes, JWT + bcrypt para el login de administrador.
- **Frontend**: React + Vite + TailwindCSS, `react-router-dom`, `react-signature-canvas` para la
  firma táctil.
- Corre en esta computadora, expuesta a internet con un link público fijo vía **Cloudflare
  Tunnel** (gratis) — así cualquier trabajador entra desde su celular sin estar en la misma WiFi.

## Link público (para los trabajadores)

**https://successfully-librarian-handed-projection.trycloudflare.com**

Ese es el link/dominio que deben usar los QR y el botón de WhatsApp. Es gratis y no expira, pero
**depende de que esta computadora esté encendida, conectada a internet, y con estos dos programas
corriendo**. Si reinicias la PC o se cierra alguna ventana, sigue estos pasos para levantarlo todo
de nuevo (puedes pegar cada bloque en una terminal PowerShell distinta):

**Terminal 1 — Backend (sirve la app completa en el puerto 3001):**
```powershell
cd C:\Users\ADMIN\Documents\app-capacitacion-sst\backend
npm start
```

**Terminal 2 — Túnel público (deja esta ventana abierta):**
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3001
```

⚠️ **Importante:** si reinicias el túnel (cierras y vuelves a abrir la Terminal 2), Cloudflare te
dará una **URL nueva y distinta** cada vez (algo como `https://otras-palabras-random.trycloudflare.com`),
y tendrás que actualizar `PUBLIC_BASE_URL` en `backend/.env` con esa nueva URL y volver a generar
los QR desde el panel. Mientras no cierres la Terminal 2, la URL actual (`successfully-librarian-handed-projection.trycloudflare.com`)
se mantiene igual. Si esto se vuelve una molestia frecuente, existe la opción de conseguir un
dominio propio (~$10–15/año) para tener una URL que nunca cambie — avísame si lo quieres y te
ayudo a configurarlo.

## Credenciales de administrador

Usuario: `admin` · Contraseña: la que se generó al exponer la app públicamente (te la compartí por
chat — cámbiala cuando quieras desde `backend/.env`, campo `ADMIN_PASSWORD_HASH`, generando un
nuevo hash con el comando de abajo).

## Requisitos

- Node.js 22 o superior (se usó Node 26 al construir esta app). Verifica con `node -v`.
- El celular de cada asistente debe estar conectado **a la misma red WiFi** que la computadora
  donde corres la app.
- **LibreOffice** instalado (ya está instalado en esta máquina) — se usa para convertir
  automáticamente los archivos `.pptx` que suba el administrador a PDF. Si migras la app a otra
  computadora, instálalo desde https://www.libreoffice.org/download/download/ (instalador
  estándar, ~300 MB, requiere permisos de administrador) o vía `winget install
  TheDocumentFoundation.LibreOffice`. El backend busca `soffice.exe` en la ruta por defecto de
  Windows (`C:\Program Files\LibreOffice\program\soffice.exe`); si quedó en otra ruta, defínela en
  `backend/.env` como `LIBREOFFICE_PATH`.

## Instalación y ejecución (para seguir editando la app)

Esta sección es solo si tú o alguien más va a **modificar el código**. Para el uso diario con los
trabajadores no hace falta nada de esto — basta con que el backend y el túnel de la sección
anterior sigan corriendo.

Abre **dos terminales**.

**Terminal 1 — Backend**

```bash
cd backend
copy .env.example .env        # en PowerShell: Copy-Item .env.example .env
```

Edita `.env` y define un usuario/clave de administrador. Para generar el hash de la contraseña:

```bash
node -e "console.log(require('bcryptjs').hashSync('TU_CLAVE_AQUI', 10))"
```

Pega ese valor en `ADMIN_PASSWORD_HASH` dentro de `.env`, y ajusta `ADMIN_USER` y `JWT_SECRET`.

```bash
npm install
npm run dev
```

El backend queda en `http://localhost:3001` y en la consola imprime también la IP de tu red WiFi
(por ejemplo `http://192.168.1.55:3001`) — esa IP es la que usarán los celulares.

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

El frontend queda en `http://localhost:5173` (y accesible en red vía la misma IP LAN, ya que el
script `dev` usa `--host`). Abre `http://localhost:5173/admin` en tu computadora para entrar al
panel de administrador.

> Los QR generados por la app ya usan automáticamente la IP LAN detectada del backend — no hace
> falta configurar nada más para que los celulares escaneen y entren.

## Flujo de uso

1. En `/admin`, inicia sesión con el usuario/clave que configuraste en `.env`.
2. Crea una nueva sesión: encabezado (ciudad, lugar, fecha, actividad realizada, temas), el
   material de la capacitación (video/enlace/texto/imágenes) y las 5 preguntas del quiz.
3. Entra al detalle de la sesión para ver el QR/link — compártelo o proyéctalo para que los
   asistentes lo escaneen desde su celular.
4. Los asistentes completan el flujo (contenido → quiz → datos → firma) desde su navegador móvil.
5. En el panel verás la lista de asistentes en vivo (se actualiza cada 5s) y puedes exportar el
   Excel en cualquier momento con el botón "Exportar Excel".

## Limitaciones conocidas (decisiones de diseño, no bugs)

- **"100% del contenido visto" no se puede verificar de forma perfecta** para enlaces externos
  (Drive, OneDrive, Vimeo, Canva, Prezi, Slides) por restricciones de seguridad de los navegadores
  entre sitios (cross-origin). Para YouTube sí se detecta la reproducción real (API oficial de
  YouTube). Para el resto de enlaces, y para texto/imágenes, se usa un temporizador mínimo
  validado también en el backend (no solo visual) como mecanismo razonable de control. Está
  documentado con detalle en `backend/src/routes/content.routes.js`.
- **El asistente no tiene cuenta/login** — se identifica con un token aleatorio guardado en el
  navegador (`sessionStorage`) mientras dura su sesión de capacitación, usado para contar sus 3
  intentos de quiz. Borrar el storage del navegador técnicamente reinicia ese conteo. Para una
  herramienta interna de asistencia esto es razonable; una defensa 100% a prueba de trampas
  requeriría cuentas de usuario.
- La subida de video como archivo (`.mp4`) no está incluida en esta iteración — el material tipo
  "video" funciona únicamente con enlaces (YouTube, Vimeo, Drive, OneDrive, etc.), según lo
  acordado.
- El botón "Generar preguntas con IA" no está incluido en esta iteración (requiere tu propia API
  key de Anthropic); las 5 preguntas se crean y editan manualmente en el panel.
- **Presentaciones de PowerPoint (`.pptx`)**: en el material tipo "Texto / documento" puedes subir
  un `.pptx` además de un PDF — el backend lo convierte automáticamente a PDF con LibreOffice y se
  visualiza igual que un PDF subido (con el mismo bloqueo por tiempo mínimo antes de continuar).
  La conversión puede tardar varios segundos según el tamaño del archivo; el panel muestra
  "Convirtiendo PowerPoint a PDF…" mientras tanto.

## Estructura del proyecto

```
backend/    API REST (Express) + SQLite + exportación Excel
frontend/   Panel de administrador + flujo del asistente (React + Vite)
```

Cada carpeta tiene su propio `package.json`; instala y corre cada una por separado como se indicó
arriba.
