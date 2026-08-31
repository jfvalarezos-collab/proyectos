import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);

const CANDIDATE_PATHS = [
  process.env.LIBREOFFICE_PATH,
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  'soffice', // en PATH (Linux/Mac, o si el usuario lo agregó manualmente)
].filter(Boolean);

let resolvedSofficePath = null;

function findSoffice() {
  if (resolvedSofficePath) return resolvedSofficePath;
  for (const candidate of CANDIDATE_PATHS) {
    if (candidate === 'soffice' || fs.existsSync(candidate)) {
      resolvedSofficePath = candidate;
      return candidate;
    }
  }
  return null;
}

// Convierte un .pptx a .pdf usando LibreOffice en modo headless. Se usa un perfil de
// usuario temporal único por conversión (-env:UserInstallation) para evitar el error
// "otra instancia de soffice ya está en ejecución" cuando hay conversiones concurrentes
// o queda un proceso soffice.bin colgado de una ejecución anterior.
export async function convertPptxToPdf(inputPath, outputDir) {
  const soffice = findSoffice();
  if (!soffice) {
    const err = new Error(
      'LibreOffice no está instalado o no se encontró soffice.exe. Instálalo desde ' +
        'https://www.libreoffice.org/download/download/ o define LIBREOFFICE_PATH en ' +
        'backend/.env con la ruta completa a soffice.exe.'
    );
    err.code = 'LIBREOFFICE_NOT_FOUND';
    throw err;
  }

  const profileDir = path.join(
    os.tmpdir(),
    `lo-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const profileUrl = `file:///${profileDir.replace(/\\/g, '/')}`;

  try {
    await execFileAsync(
      soffice,
      [
        '--headless',
        '--norestore',
        `-env:UserInstallation=${profileUrl}`,
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        inputPath,
      ],
      { timeout: 120_000 }
    );
  } catch (err) {
    const wrapped = new Error(`Falló la conversión de PowerPoint a PDF: ${err.message}`);
    wrapped.code = 'CONVERSION_FAILED';
    throw wrapped;
  } finally {
    fs.rm(profileDir, { recursive: true, force: true }, () => {});
  }

  const outputName = `${path.basename(inputPath, path.extname(inputPath))}.pdf`;
  const outputPath = path.join(outputDir, outputName);
  if (!fs.existsSync(outputPath)) {
    const err = new Error('La conversión terminó pero no se generó el archivo PDF esperado.');
    err.code = 'CONVERSION_OUTPUT_MISSING';
    throw err;
  }
  return outputPath;
}
