# Imagen para desplegar app-capacitacion-sst en Railway (o cualquier host con Docker).
#
# Node 22 (LTS): backend/src/db/db.js usa el módulo nativo node:sqlite, que funciona sin
# flags experimentales desde Node 22.13 / 23.4 en adelante.
#
# La conversión de .pptx subidos por el administrador a PDF (backend/src/services/
# pptxConvert.service.js) depende de tener "soffice" (LibreOffice) disponible en el PATH —
# por eso se instala vía apt en la etapa final, en vez de depender del builder automático.

# ---- Etapa 1: build del frontend (Vite) ----
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Etapa 2: imagen final — backend + LibreOffice headless ----
FROM node:22-bookworm-slim
WORKDIR /app

# libreoffice (metapaquete: incluye Impress/Writer/Calc, necesarios para --convert-to pdf)
# + fuentes básicas, para que el texto de las presentaciones convertidas no se vea roto.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice \
      fonts-dejavu \
      fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# backend/data (SQLite) y backend/uploads (archivos subidos) deben montarse como volúmenes
# persistentes en estas rutas del contenedor — ver plan de migración a Railway.
EXPOSE 3001
CMD ["node", "backend/src/server.js"]
