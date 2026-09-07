import { useState } from 'react';
import { api } from '../lib/api.js';

const TIPOS = [
  { value: 'video', label: 'Video grabado (enlace: YouTube, Vimeo, Drive, OneDrive…)' },
  { value: 'presentacion', label: 'Enlace externo de presentación (Prezi, Canva, Genially, Slides…)' },
  { value: 'texto', label: 'Texto / documento' },
  { value: 'imagenes', label: 'Presentaciones en Prezi/PowerPoint' },
];

// Documentos (PDF/PPTX) y videos (presentaciones exportadas como .mp4/.wmv, grabaciones de
// NotebookLM, etc.) comparten el mismo input de "subir archivo completo" — sin esto en el
// accept, el selector de Windows los oculta aunque sí existan en la carpeta.
const DOCUMENTO_ACCEPT =
  '.pdf,.pptx,.mp4,.wmv,.mov,.avi,' +
  'application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
  'video/mp4,video/x-ms-wmv,video/quicktime,video/x-msvideo';

// Una sesión guardada sin contenido real (ej. tipo "video" sin URL) deja al trabajador viendo
// una pantalla vacía sin nada que marque el contenido como visto — usado por SessionCreate y
// SessionDetail para bloquear el guardado antes de que eso llegue a publicarse.
export function materialTieneContenido(materialTipo, materialPayload = {}) {
  if (materialTipo === 'video' || materialTipo === 'presentacion') {
    return !!materialPayload.url?.trim();
  }
  if (materialTipo === 'texto') {
    return !!materialPayload.texto?.trim() || !!materialPayload.archivoUrl;
  }
  if (materialTipo === 'imagenes') {
    return !!materialPayload.archivoUrl || materialPayload.imagenes?.length > 0;
  }
  return false;
}

export default function MaterialEditor({ materialTipo, materialPayload, onChange }) {
  const [uploadingLabel, setUploadingLabel] = useState('');
  const [uploadError, setUploadError] = useState('');

  function setPayload(patch) {
    onChange(materialTipo, { ...materialPayload, ...patch });
  }

  async function handleFileUpload(e, target) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const isPptx = files.some((f) => /\.pptx$/i.test(f.name));
    setUploadingLabel(
      isPptx ? 'Convirtiendo PowerPoint a PDF… puede tardar unos segundos' : 'Subiendo…'
    );
    setUploadError('');
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('archivos', f));
      const { files: uploaded } = await api.uploadFiles(formData);
      if (target === 'imagenes') {
        setPayload({ imagenes: [...(materialPayload.imagenes || []), ...uploaded.map((f) => f.url)] });
      } else {
        setPayload({ archivoUrl: uploaded[0].url });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingLabel('');
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Material de la capacitación</label>
      <select
        className="w-full border border-slate-300 rounded-lg px-3 py-2"
        value={materialTipo}
        onChange={(e) => onChange(e.target.value, {})}
      >
        {TIPOS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {(materialTipo === 'video' || materialTipo === 'presentacion') && (
        <div className="space-y-2">
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="https://..."
            value={materialPayload.url || ''}
            onChange={(e) => setPayload({ url: e.target.value })}
          />
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Duración estimada (minutos) — se usa para exigir que el asistente permanezca
              viendo el contenido antes de continuar. Para enlaces de YouTube esto se ignora:
              se detecta automáticamente cuándo termina el video.
            </label>
            <input
              type="number"
              min="1"
              className="w-32 border border-slate-300 rounded-lg px-3 py-2"
              value={materialPayload.duracionEstimadaMin || ''}
              onChange={(e) => setPayload({ duracionEstimadaMin: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {materialTipo === 'texto' && (
        <div className="space-y-2">
          <textarea
            className="w-full border border-slate-300 rounded-lg px-3 py-2 h-32"
            placeholder="Pega aquí el contenido de la capacitación…"
            value={materialPayload.texto || ''}
            onChange={(e) => setPayload({ texto: e.target.value })}
          />
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              O sube un PDF, una presentación de PowerPoint (.pptx) o un video (.mp4, .wmv,
              .mov, .avi) — el .pptx se convierte a PDF automáticamente, el video se guarda tal
              cual (opcional)
            </label>
            <input type="file" accept={DOCUMENTO_ACCEPT} onChange={(e) => handleFileUpload(e, 'documento')} />
            {materialPayload.archivoUrl && (
              <p className="text-xs text-emerald-600 mt-1">Documento cargado: {materialPayload.archivoUrl}</p>
            )}
          </div>
        </div>
      )}

      {materialTipo === 'imagenes' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Sube tu presentación completa: .pptx, .pdf, o un video (.mp4, .wmv, .mov, .avi —
              por ejemplo una presentación exportada como video, o generada en NotebookLM). El
              .pptx se convierte a PDF automáticamente; el video se guarda tal cual
            </label>
            <input type="file" accept={DOCUMENTO_ACCEPT} onChange={(e) => handleFileUpload(e, 'documento')} />
            {materialPayload.archivoUrl && (
              <p className="text-xs text-emerald-600 mt-1">Presentación cargada: {materialPayload.archivoUrl}</p>
            )}
          </div>

          {materialPayload.archivoUrl && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Minutos estimados de lectura — se usa para exigir que el asistente permanezca
                viendo el contenido antes de continuar.
              </label>
              <input
                type="number"
                min="1"
                className="w-32 border border-slate-300 rounded-lg px-3 py-2"
                value={materialPayload.duracionEstimadaMin || ''}
                onChange={(e) => setPayload({ duracionEstimadaMin: Number(e.target.value) })}
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              O, en vez del archivo completo, sube imágenes sueltas de las diapositivas (opcional)
            </label>
            <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'imagenes')} />
          </div>
          {materialPayload.imagenes?.length > 0 && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Segundos mínimos por diapositiva</label>
              <input
                type="number"
                min="1"
                className="w-32 border border-slate-300 rounded-lg px-3 py-2"
                value={materialPayload.segundosPorDiapositiva || 3}
                onChange={(e) => setPayload({ segundosPorDiapositiva: Number(e.target.value) })}
              />
              <div className="flex gap-2 flex-wrap mt-2">
                {materialPayload.imagenes.map((url, i) => (
                  <img key={i} src={url} alt={`Diapositiva ${i + 1}`} className="h-20 rounded border" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {uploadingLabel && <p className="text-xs text-slate-500">{uploadingLabel}</p>}
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}
