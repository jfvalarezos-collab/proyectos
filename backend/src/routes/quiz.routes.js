import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';

const router = Router({ mergeParams: true });

const MAX_INTENTOS = 3;
const APROBACION_MINIMA = 0.6;

function attemptsFor(sessionId, participantToken) {
  return db
    .prepare(
      'SELECT * FROM quiz_attempts WHERE session_id = ? AND participant_token = ? ORDER BY intento_numero'
    )
    .all(sessionId, participantToken);
}

router.get('/attempts', (req, res) => {
  const session = req.trainingSession;
  const participantToken = req.query.participantToken;
  if (!participantToken) return res.status(400).json({ error: 'participantToken es requerido' });

  const attempts = attemptsFor(session.id, participantToken);
  const aprobadoAlguna = attempts.some((a) => a.aprobado);
  res.json({
    attempts: attempts.map((a) => ({
      intentoNumero: a.intento_numero,
      aciertos: a.aciertos,
      aprobado: !!a.aprobado,
    })),
    intentosUsados: attempts.length,
    intentosRestantes: Math.max(0, MAX_INTENTOS - attempts.length),
    aprobadoAlguna,
    bloqueado: !aprobadoAlguna && attempts.length >= MAX_INTENTOS,
  });
});

router.post('/attempt', (req, res) => {
  const session = req.trainingSession;
  const { participantToken, respuestas } = req.body ?? {};
  if (!participantToken || !Array.isArray(respuestas)) {
    return res.status(400).json({ error: 'participantToken y respuestas son requeridos' });
  }

  const progress = db
    .prepare('SELECT viewed FROM content_progress WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);
  if (!progress?.viewed) {
    return res.status(403).json({ error: 'Debes completar la visualización del contenido antes del quiz' });
  }

  const previousAttempts = attemptsFor(session.id, participantToken);
  if (previousAttempts.some((a) => a.aprobado)) {
    return res.status(403).json({ error: 'Ya aprobaste el quiz de esta sesión' });
  }
  if (previousAttempts.length >= MAX_INTENTOS) {
    return res.status(403).json({ error: 'Se agotaron los 3 intentos permitidos', bloqueado: true });
  }

  const questions = db
    .prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY orden')
    .all(session.id);
  if (questions.length !== 5 || respuestas.length !== 5) {
    return res.status(400).json({ error: 'Se esperan 5 respuestas' });
  }

  const aciertos = questions.reduce(
    (acc, q, i) => acc + (Number(respuestas[i]) === q.respuesta_correcta ? 1 : 0),
    0
  );
  const aprobado = aciertos / questions.length >= APROBACION_MINIMA;
  const intentoNumero = previousAttempts.length + 1;

  db.prepare(
    `INSERT INTO quiz_attempts (id, session_id, participant_token, intento_numero, respuestas, aciertos, aprobado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid(), session.id, participantToken, intentoNumero, JSON.stringify(respuestas), aciertos, aprobado ? 1 : 0);

  const intentosRestantes = Math.max(0, MAX_INTENTOS - intentoNumero);
  res.json({
    aciertos,
    totalPreguntas: questions.length,
    aprobado,
    intentoNumero,
    intentosRestantes,
    bloqueado: !aprobado && intentosRestantes === 0,
  });
});

export default router;
