import { Router } from 'express';
import db from '../db/db.js';
import contentRouter from './content.routes.js';
import quizRouter from './quiz.routes.js';
import attendeesRouter from './attendees.routes.js';

const router = Router();

function loadSession(req, res, next) {
  const row = db.prepare('SELECT * FROM sessions WHERE qr_token = ?').get(req.params.token);
  if (!row) return res.status(404).json({ error: 'Sesión no encontrada' });
  if (!row.published) return res.status(403).json({ error: 'Esta sesión está cerrada para nuevos registros' });
  req.trainingSession = { ...row, material_payload: JSON.parse(row.material_payload || '{}') };
  next();
}

router.get('/sessions/:token', loadSession, (req, res) => {
  const session = req.trainingSession;
  const questions = db
    .prepare('SELECT id, orden, texto, opciones FROM questions WHERE session_id = ? ORDER BY orden')
    .all(session.id)
    .map((q) => ({ ...q, opciones: JSON.parse(q.opciones) }));

  // No se envía la respuesta correcta al cliente.
  const { id, formato_codigo, ciudad, lugar, fecha, actividad_tipo, temas_tratados, material_tipo, material_payload, facilitador_nombre } = session;
  res.json({
    id,
    formatoCodigo: formato_codigo,
    ciudad,
    lugar,
    fecha,
    actividadTipo: actividad_tipo,
    temasTratados: temas_tratados,
    materialTipo: material_tipo,
    materialPayload: material_payload,
    facilitadorNombre: facilitador_nombre,
    questions,
  });
});

router.use('/sessions/:token/content', loadSession, contentRouter);
router.use('/sessions/:token/quiz', loadSession, quizRouter);
router.use('/sessions/:token/attendees', loadSession, attendeesRouter);

export default router;
