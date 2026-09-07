import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { v4 as uuid } from 'uuid';
import { convertPptxToPdf } from '../services/pptxConvert.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const ALLOWED = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.pptx', '.mp4', '.wmv', '.mov', '.avi']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  // Los videos (presentaciones exportadas como .mp4/.wmv, grabaciones de NotebookLM, etc.)
  // pesan mucho más que un PDF o una imagen — se sirven y guardan tal cual, sin conversión.
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return cb(new Error('Tipo de archivo no permitido (solo PDF, PPTX, imágenes o video: mp4/wmv/mov/avi)'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/', upload.array('archivos', 20), async (req, res, next) => {
  try {
    const files = [];
    for (const f of req.files ?? []) {
      const ext = path.extname(f.filename).toLowerCase();
      if (ext === '.pptx') {
        const pdfPath = await convertPptxToPdf(f.path, uploadsDir);
        fs.unlink(f.path, () => {}); // ya no necesitamos el .pptx original
        files.push({
          url: `/uploads/${path.basename(pdfPath)}`,
          originalName: f.originalname.replace(/\.pptx$/i, '.pdf'),
          convertedFrom: 'pptx',
        });
      } else {
        files.push({ url: `/uploads/${f.filename}`, originalName: f.originalname });
      }
    }
    res.status(201).json({ files });
  } catch (err) {
    next(err);
  }
});

export default router;
