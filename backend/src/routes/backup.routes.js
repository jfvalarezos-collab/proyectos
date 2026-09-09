import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { dataDir } from '../config/storage.js';

const router = Router();

// Descarga el archivo SQLite completo tal cual está en disco, para que el admin pueda
// abrirlo con un cliente como Navicat/DB Browser y guardar respaldos periódicos fuera
// de esta computadora.
router.get('/', (req, res) => {
  const dbPath = path.join(dataDir, 'app.db');
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'Base de datos no encontrada' });

  const fecha = new Date().toISOString().slice(0, 10);
  res.download(dbPath, `respaldo-sst-${fecha}.db`);
});

export default router;
