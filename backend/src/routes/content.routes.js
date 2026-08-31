import { Router } from 'express';
import db from '../db/db.js';

const router = Router({ mergeParams: true });

const isYoutube = (url = '') => /youtube\.com|youtu\.be/i.test(url);

function minDwellSecondsForTexto(texto = '') {
  const chars = texto.length;
  return Math.max(15, Math.ceil((chars / 1000) * 60));
}

router.get('/status', (req, res) => {
  const session = req.trainingSession;
  const participantToken = req.query.participantToken;
  if (!participantToken) return res.status(400).json({ error: 'participantToken es requerido' });

  const progress = db
    .prepare('SELECT * FROM content_progress WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);

  res.json({ viewed: !!progress?.viewed, startedAt: progress?.started_at ?? null });
});

router.post('/start', (req, res) => {
  const session = req.trainingSession;
  const { participantToken } = req.body ?? {};
  if (!participantToken) return res.status(400).json({ error: 'participantToken es requerido' });

  const existing = db
    .prepare('SELECT * FROM content_progress WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);

  if (!existing) {
    db.prepare(
      `INSERT INTO content_progress (session_id, participant_token, started_at, viewed)
       VALUES (?, ?, datetime('now'), 0)`
    ).run(session.id, participantToken);
  }

  const row = db
    .prepare('SELECT * FROM content_progress WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);
  res.json({ startedAt: row.started_at, viewed: !!row.viewed });
});

router.post('/complete', (req, res) => {
  const session = req.trainingSession;
  const { participantToken, evidence } = req.body ?? {};
  if (!participantToken) return res.status(400).json({ error: 'participantToken es requerido' });

  const progress = db
    .prepare('SELECT * FROM content_progress WHERE session_id = ? AND participant_token = ?')
    .get(session.id, participantToken);
  if (!progress?.started_at) {
    return res.status(400).json({ error: 'Debes iniciar la visualización del contenido primero (POST /start)' });
  }

  const elapsedSeconds = (Date.now() - new Date(progress.started_at + 'Z').getTime()) / 1000;
  const payload = session.material_payload || {};
  let ok = false;

  if (session.material_tipo === 'video' && isYoutube(payload.url)) {
    ok = !!evidence?.youtubeEnded;
  } else if (session.material_tipo === 'video' || session.material_tipo === 'presentacion') {
    const requiredSeconds = Math.max(10, (Number(payload.duracionEstimadaMin) || 1) * 60 - 5);
    ok = elapsedSeconds >= requiredSeconds;
  } else if (session.material_tipo === 'texto') {
    ok = !!evidence?.scrolledToEnd && elapsedSeconds >= minDwellSecondsForTexto(payload.texto);
  } else if (session.material_tipo === 'imagenes') {
    const slideCount = Array.isArray(payload.imagenes) ? payload.imagenes.length : 0;
    const segundosPorSlide = Number(payload.segundosPorDiapositiva) || 3;
    ok = !!evidence?.allSlidesViewed && elapsedSeconds >= slideCount * segundosPorSlide;
  }

  if (!ok) {
    return res.status(400).json({ error: 'Aún no se cumplen las condiciones para marcar el contenido como visto' });
  }

  db.prepare(
    `UPDATE content_progress SET viewed = 1, completed_at = datetime('now')
     WHERE session_id = ? AND participant_token = ?`
  ).run(session.id, participantToken);

  res.json({ viewed: true });
});

export default router;
