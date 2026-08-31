import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';

const router = Router({ mergeParams: true });

// Reemplaza las 5 preguntas de la sesión de una sola vez (así se edita el editor completo).
router.put('/', (req, res) => {
  const sessionId = req.params.id;
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

  const preguntas = Array.isArray(req.body?.preguntas) ? req.body.preguntas : [];
  if (preguntas.length !== 5) {
    return res.status(400).json({ error: 'Se requieren exactamente 5 preguntas' });
  }
  for (const p of preguntas) {
    if (!p.texto || !Array.isArray(p.opciones) || p.opciones.length !== 4) {
      return res.status(400).json({ error: 'Cada pregunta necesita texto y 4 opciones' });
    }
    if (![0, 1, 2, 3].includes(Number(p.respuestaCorrecta))) {
      return res.status(400).json({ error: 'respuestaCorrecta debe ser 0-3' });
    }
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM questions WHERE session_id = ?').run(sessionId);
    const insert = db.prepare(
      `INSERT INTO questions (id, session_id, orden, texto, opciones, respuesta_correcta)
       VALUES (@id, @session_id, @orden, @texto, @opciones, @respuesta_correcta)`
    );
    preguntas.forEach((p, orden) => {
      insert.run({
        id: uuid(),
        session_id: sessionId,
        orden,
        texto: p.texto,
        opciones: JSON.stringify(p.opciones),
        respuesta_correcta: Number(p.respuestaCorrecta),
      });
    });
  });
  tx();

  const rows = db
    .prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY orden')
    .all(sessionId)
    .map((q) => ({ ...q, opciones: JSON.parse(q.opciones) }));
  res.json(rows);
});

export default router;
