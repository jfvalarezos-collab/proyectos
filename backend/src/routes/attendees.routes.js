import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';
import { validarCedulaEcuatoriana } from '../services/cedula.js';

const router = Router({ mergeParams: true });

router.get('/me', (req, res) => {
  const session = req.trainingSession;
  const participantToken = req.query.participantToken;
  if (!participantToken) return res.status(400).json({ error: 'participantToken es requerido' });

  const attendee = db
    .prepare('SELECT * FROM attendees WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);
  res.json({ registered: !!attendee, attendee: attendee ?? null });
});

router.post('/', (req, res) => {
  const session = req.trainingSession;
  const { participantToken, nombre, cedula, cargo, firmaPng } = req.body ?? {};

  if (!participantToken || !nombre?.trim() || !cargo?.trim() || !firmaPng) {
    return res.status(400).json({ error: 'nombre, cargo y firma son requeridos' });
  }
  if (!validarCedulaEcuatoriana(cedula)) {
    return res.status(400).json({ error: 'Cédula ecuatoriana inválida' });
  }
  if (!/^data:image\/png;base64,/.test(firmaPng)) {
    return res.status(400).json({ error: 'Firma inválida' });
  }

  const already = db
    .prepare('SELECT id FROM attendees WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);
  if (already) {
    return res.status(409).json({ error: 'Ya se envió un registro para este participante en esta sesión' });
  }

  const progress = db
    .prepare('SELECT viewed FROM content_progress WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);
  if (!progress?.viewed) {
    return res.status(403).json({ error: 'No se completó la visualización del contenido' });
  }

  const attempts = db
    .prepare('SELECT * FROM quiz_attempts WHERE session_id = ? AND participant_token = ? ORDER BY intento_numero')
    .all(session.id, participantToken);
  const attemptAprobado = attempts.find((a) => a.aprobado);
  if (!attemptAprobado) {
    const umbralPct = session.num_preguntas === 10 ? 70 : 60;
    return res
      .status(403)
      .json({ error: `No hay un intento de evaluación aprobado (≥${umbralPct}%) para este participante` });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO attendees (id, session_id, participant_token, nombre, cedula, cargo, firma_png, aciertos_aprobados)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, session.id, participantToken, nombre.trim(), cedula, cargo.trim(), firmaPng, attemptAprobado.aciertos);

  const row = db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
  res.status(201).json(row);
});

export default router;
