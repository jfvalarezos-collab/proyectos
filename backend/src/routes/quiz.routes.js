import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';

const router = Router({ mergeParams: true });

const MAX_INTENTOS = 3;

// Las únicas dos modalidades soportadas: 5 preguntas (mínimo 3 correctas, 60%) o
// 10 preguntas (mínimo 7 correctas, 70%).
function minimoCorrectas(totalPreguntas) {
  return totalPreguntas === 10 ? 7 : 3;
}

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
  // Candado defensivo: la sesión solo debería tener 5 o 10 preguntas (lo garantiza
  // questions.routes.js al guardar), esto solo cubre datos corruptos/inesperados.
  if (![5, 10].includes(questions.length)) {
    return res.status(500).json({ error: 'La sesión tiene una configuración de preguntas inválida' });
  }
  if (respuestas.length !== questions.length) {
    return res.status(400).json({ error: `Se esperan ${questions.length} respuestas` });
  }

  const aciertos = questions.reduce(
    (acc, q, i) => acc + (Number(respuestas[i]) === q.respuesta_correcta ? 1 : 0),
    0
  );
  const aprobado = aciertos >= minimoCorrectas(questions.length);
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
