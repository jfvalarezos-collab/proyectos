import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';
import { buildSessionQrDataUrl, buildSessionUrl } from '../services/qr.service.js';
import questionsRouter from './questions.routes.js';
import exportRouter from './export.routes.js';

const router = Router();

function rowToSession(row) {
  if (!row) return null;
  return { ...row, material_payload: JSON.parse(row.material_payload || '{}'), published: !!row.published };
}

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM attendees a WHERE a.session_id = s.id) AS total_asistentes
       FROM sessions s ORDER BY s.created_at DESC`
    )
    .all();
  res.json(rows.map(rowToSession));
});

router.post('/', (req, res) => {
  const b = req.body ?? {};
  if (!b.ciudad || !b.lugar || !b.fecha || !b.actividadTipo) {
    return res.status(400).json({ error: 'ciudad, lugar, fecha y actividadTipo son requeridos' });
  }

  // La evaluación solo admite dos modalidades fijas: 5 o 10 preguntas. Si no se envía,
  // se asume 5 (compatibilidad con clientes viejos).
  const numPreguntas = b.numPreguntas === undefined ? 5 : Number(b.numPreguntas);
  if (![5, 10].includes(numPreguntas)) {
    return res.status(400).json({ error: 'numPreguntas debe ser 5 o 10' });
  }

  const id = uuid();
  const qrToken = uuid();

  db.prepare(
    `INSERT INTO sessions
      (id, formato_codigo, ciudad, lugar, fecha, actividad_tipo, actividad_otra_detalle,
       temas_tratados, material_tipo, material_payload, facilitador_nombre, qr_token, num_preguntas)
     VALUES (@id, @formato_codigo, @ciudad, @lugar, @fecha, @actividad_tipo, @actividad_otra_detalle,
       @temas_tratados, @material_tipo, @material_payload, @facilitador_nombre, @qr_token, @num_preguntas)`
  ).run({
    id,
    formato_codigo: b.formatoCodigo || 'FT-SST-02',
    ciudad: b.ciudad,
    lugar: b.lugar,
    fecha: b.fecha,
    actividad_tipo: b.actividadTipo,
    actividad_otra_detalle: b.actividadOtraDetalle || '',
    temas_tratados: b.temasTratados || '',
    material_tipo: b.materialTipo || 'texto',
    material_payload: JSON.stringify(b.materialPayload || {}),
    facilitador_nombre: b.facilitadorNombre || '',
    qr_token: qrToken,
    num_preguntas: numPreguntas,
  });

  // Preguntas vacías por defecto (5 o 10 según la modalidad elegida), listas para editar
  const insertQ = db.prepare(
    `INSERT INTO questions (id, session_id, orden, texto, opciones, respuesta_correcta)
     VALUES (@id, @session_id, @orden, '', '["","","",""]', 0)`
  );
  for (let i = 0; i < numPreguntas; i++) {
    insertQ.run({ id: uuid(), session_id: id, orden: i });
  }

  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  res.status(201).json(rowToSession(row));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Sesión no encontrada' });
  const questions = db
    .prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY orden')
    .all(req.params.id)
    .map((q) => ({ ...q, opciones: JSON.parse(q.opciones) }));
  res.json({ ...rowToSession(row), questions });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Sesión no encontrada' });
  const b = req.body ?? {};

  db.prepare(
    `UPDATE sessions SET
      formato_codigo = @formato_codigo, ciudad = @ciudad, lugar = @lugar, fecha = @fecha,
      actividad_tipo = @actividad_tipo, actividad_otra_detalle = @actividad_otra_detalle,
      temas_tratados = @temas_tratados, material_tipo = @material_tipo,
      material_payload = @material_payload, facilitador_nombre = @facilitador_nombre,
      published = @published
     WHERE id = @id`
  ).run({
    id: req.params.id,
    formato_codigo: b.formatoCodigo ?? existing.formato_codigo,
    ciudad: b.ciudad ?? existing.ciudad,
    lugar: b.lugar ?? existing.lugar,
    fecha: b.fecha ?? existing.fecha,
    actividad_tipo: b.actividadTipo ?? existing.actividad_tipo,
    actividad_otra_detalle: b.actividadOtraDetalle ?? existing.actividad_otra_detalle,
    temas_tratados: b.temasTratados ?? existing.temas_tratados,
    material_tipo: b.materialTipo ?? existing.material_tipo,
    material_payload: b.materialPayload ? JSON.stringify(b.materialPayload) : existing.material_payload,
    facilitador_nombre: b.facilitadorNombre ?? existing.facilitador_nombre,
    published: b.published !== undefined ? (b.published ? 1 : 0) : existing.published,
  });

  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json(rowToSession(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.status(204).end();
});

router.get('/:id/qr', async (req, res) => {
  const row = db.prepare('SELECT qr_token FROM sessions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Sesión no encontrada' });
  const frontendPort = Number(req.query.frontendPort) || 5173;
  const { url, dataUrl } = await buildSessionQrDataUrl(row.qr_token, frontendPort);
  res.json({ url, dataUrl });
});

router.get('/:id/attendees', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM attendees WHERE session_id = ? ORDER BY created_at')
    .all(req.params.id);
  res.json(rows);
});

router.use('/:id/questions', questionsRouter);
router.use('/:id/export', exportRouter);

export { buildSessionUrl };
export default router;
