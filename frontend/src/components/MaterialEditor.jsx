import { useState } from 'react';
import { api } from '../lib/api.js';

const TIPOS = [
  { value: 'video', label: 'Video grabado (enlace: YouTube, Vimeo, Drive, OneDrive…)' },
  { value: 'presentacion', label: 'Enlace externo de presentación (Prezi, Canva, Genially, Slides…)' },
  { value: 'texto', label: 'Texto / documento' },
  { value: 'imagenes', label: 'Imágenes de diapositivas' },
];

export default function MaterialEditor({ materialTipo, materialPayload, onChange }) {
  const [uploadingLabel, setUploadingLabel] = useState('');
  const [uploadError, setUploadError] = useState('');

  function setPayload(patch) {
    onChange(materialTipo, { ...materialPayload, ...patch });
  }

  async function handleFileUpload(e, multiple) {
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
      if (multiple) {
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
              O sube un PDF o una presentación de PowerPoint (.pptx) — se convierte a PDF
              automáticamente (opcional)
            </label>
            <input
              type="file"
              accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => handleFileUpload(e, false)}
            />
            {materialPayload.archivoUrl && (
              <p className="text-xs text-emerald-600 mt-1">Documento cargado: {materialPayload.archivoUrl}</p>
            )}
          </div>
        </div>
      )}

      {materialTipo === 'imagenes' && (
        <div className="space-y-2">
          <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, true)} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Segundos mínimos por diapositiva</label>
            <input
              type="number"
              min="1"
              className="w-32 border border-slate-300 rounded-lg px-3 py-2"
              value={materialPayload.segundosPorDiapositiva || 3}
              onChange={(e) => setPayload({ segundosPorDiapositiva: Number(e.target.value) })}
            />
          </div>
          {materialPayload.imagenes?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {materialPayload.imagenes.map((url, i) => (
                <img key={i} src={url} alt={`Diapositiva ${i + 1}`} className="h-20 rounded border" />
              ))}
            </div>
          )}
        </div>
      )}

      {uploadingLabel && <p className="text-xs text-slate-500">{uploadingLabel}</p>}
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}
