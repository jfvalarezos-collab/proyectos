import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import MaterialEditor from '../../components/MaterialEditor.jsx';
import QuestionEditor from '../../components/QuestionEditor.jsx';

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [preguntas, setPreguntas] = useState(null);
  const [qr, setQr] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getSession(id);
      setSession(s);
      setPreguntas(
        s.questions.map((q) => ({ texto: q.texto, opciones: q.opciones, respuestaCorrecta: q.respuesta_correcta }))
      );
      const qrData = await api.getSessionQr(id);
      setQr(qrData);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refreshAttendees = () => api.getSessionAttendees(id).then(setAttendees).catch(() => {});
    refreshAttendees();
    const interval = setInterval(refreshAttendees, 5000);
    return () => clearInterval(interval);
  }, [id]);

  function setField(field, value) {
    setSession((s) => ({ ...s, [field]: value }));
  }

  async function saveHeader() {
    setSaving(true);
    setSavedMsg('');
    setError('');
    try {
      await api.updateSession(id, {
        formatoCodigo: session.formato_codigo,
        ciudad: session.ciudad,
        lugar: session.lugar,
        fecha: session.fecha,
        actividadTipo: session.actividad_tipo,
        actividadOtraDetalle: session.actividad_otra_detalle,
        temasTratados: session.temas_tratados,
        materialTipo: session.material_tipo,
        materialPayload: session.material_payload,
        facilitadorNombre: session.facilitador_nombre,
      });
      await api.setQuestions(id, preguntas);
      setSavedMsg('Cambios guardados.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function whatsappShareUrl() {
    const tema = session.temas_tratados?.trim() || 'tu capacitación de SST';
    const mensaje =
      `Hola! Te comparto el link para completar "${tema}". ` +
      `Ábrelo desde tu celular, sigue los pasos y firma al final:\n${qr.url}`;
    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const { blob, filename } = await api.exportSession(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function togglePublished() {
    try {
      const updated = await api.updateSession(id, { published: !session.published });
      setSession((s) => ({ ...s, published: updated.published }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!session || !preguntas) {
    return <div className="p-6 text-slate-500">{error || 'Cargando…'}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/admin" className="text-slate-500 hover:text-slate-700 text-sm">
            ← Volver
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">{session.temas_tratados || 'Sesión'}</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Ciudad</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={session.ciudad}
                onChange={(e) => setField('ciudad', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Lugar</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={session.lugar}
                onChange={(e) => setField('lugar', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fecha</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={session.fecha}
                onChange={(e) => setField('fecha', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Facilitador</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={session.facilitador_nombre}
                onChange={(e) => setField('facilitador_nombre', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Temas tratados</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 h-24"
              value={session.temas_tratados}
              onChange={(e) => setField('temas_tratados', e.target.value)}
            />
          </div>

          <MaterialEditor
            materialTipo={session.material_tipo}
            materialPayload={session.material_payload}
            onChange={(tipo, payload) => {
              setField('material_tipo', tipo);
              setField('material_payload', payload);
            }}
          />

          <div>
            <h2 className="text-sm font-medium text-slate-700 mb-2">
              Evaluación ({session.num_preguntas} preguntas)
            </h2>
            <QuestionEditor preguntas={preguntas} onChange={setPreguntas} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {savedMsg && <p className="text-sm text-emerald-600">{savedMsg}</p>}

          <button
            onClick={saveHeader}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-5 py-2"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </section>

        <aside className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-slate-700 mb-3">QR de acceso para asistentes</p>
            {qr && <img src={qr.dataUrl} alt="QR de la sesión" className="mx-auto rounded-lg border" />}
            {qr && (
              <p className="text-xs text-slate-500 mt-3 break-all">
                {qr.url}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Si el celular no muestra vista previa al escanear, es normal — toca "Abrir" o
              "Visitar sitio" igual, la página carga bien.
            </p>

            {qr && (
              <a
                href={whatsappShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg px-4 py-2.5"
              >
                Compartir por WhatsApp
              </a>
            )}
            <p className="text-xs text-slate-400 mt-3">
              El celular debe estar conectado a la misma red WiFi que esta computadora (para el QR
              y para que el link abra correctamente al tocarlo desde WhatsApp).
            </p>
            <button
              onClick={togglePublished}
              className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium ${
                session.published
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {session.published ? 'Cerrar registro' : 'Reabrir registro'}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">Asistentes ({attendees.length})</p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="text-xs bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg px-3 py-1.5"
              >
                {exporting ? 'Generando…' : 'Exportar Excel'}
              </button>
            </div>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {attendees.map((a) => (
                <li key={a.id} className="text-sm border border-slate-100 rounded-lg p-2">
                  <p className="font-medium text-slate-800">{a.nombre}</p>
                  <p className="text-slate-500">
                    {a.cedula} · {a.cargo} · {a.aciertos_aprobados}/{session.num_preguntas}
                  </p>
                </li>
              ))}
              {attendees.length === 0 && <p className="text-sm text-slate-400">Aún no hay registros.</p>}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
