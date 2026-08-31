import { Router } from 'express';
import db from '../db/db.js';
import { buildAsistenciaWorkbook } from '../services/excelExport.service.js';

const router = Router({ mergeParams: true });

router.get('/', async (req, res) => {
  const sessionId = req.params.id;
  const sessionRow = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!sessionRow) return res.status(404).json({ error: 'Sesión no encontrada' });

  const session = { ...sessionRow, material_payload: JSON.parse(sessionRow.material_payload || '{}') };
  const questions = db.prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY orden').all(sessionId);
  const attendees = db.prepare('SELECT * FROM attendees WHERE session_id = ? ORDER BY created_at').all(sessionId);

  const workbook = await buildAsistenciaWorkbook({ session, questions, attendees });

  const filename = `Registro_Asistencia_${(session.fecha || '').replaceAll('/', '-') || sessionId}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
