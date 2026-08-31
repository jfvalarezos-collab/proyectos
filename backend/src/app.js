import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import publicRoutes from './routes/public.routes.js';
import { requireAdmin } from './middleware/requireAdmin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin/uploads', requireAdmin, uploadsRoutes);
app.use('/api/admin/sessions', requireAdmin, sessionsRoutes);
app.use('/api/public', publicRoutes);

// Sirve el frontend ya compilado (frontend/dist) en este mismo puerto, para poder
// exponer un solo puerto vía túnel público en vez de depender del servidor de
// desarrollo de Vite. Si no existe el build (dev local sin `npm run build`), se
// omite y las rutas no-API simplemente devuelven 404 como antes.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

export default app;
