import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/ está dos niveles arriba de este archivo (backend/src/config/storage.js).
const backendRoot = path.join(__dirname, '..', '..');

// Railway solo permite montar UN volumen persistente por servicio — por eso la base de
// datos (data/) y los archivos subidos (uploads/) conviven como subcarpetas de una misma
// raíz configurable, en vez de tener cada una su propio volumen. En desarrollo local, sin
// STORAGE_DIR definida, se mantiene el comportamiento de siempre: backend/data y
// backend/uploads.
const storageRoot = process.env.STORAGE_DIR || backendRoot;

export const dataDir = path.join(storageRoot, 'data');
export const uploadsDir = path.join(storageRoot, 'uploads');

for (const dir of [dataDir, uploadsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
