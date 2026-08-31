import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import MaterialEditor from '../../components/MaterialEditor.jsx';
import QuestionEditor, { emptyQuestions } from '../../components/QuestionEditor.jsx';

const ACTIVIDADES = [
  { value: 'induccion', label: 'Inducción' },
  { value: 'reinduccion', label: 'Reinducción' },
  { value: 'charla_seguridad', label: 'Charla de seguridad' },
  { value: 'reuniones_sst', label: 'Reuniones de SST / Operativas' },
  { value: 'seminario_taller', label: 'Seminario / Taller / Curso' },
  { value: 'capacitacion_cargo', label: 'Capacitación específica al cargo' },
  { value: 'otra', label: 'Otra' },
];

function todayDDMMAAAA() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function SessionCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    formatoCodigo: 'FT-SST-02',
    ciudad: '',
    lugar: '',
    fecha: todayDDMMAAAA(),
    actividadTipo: 'induccion',
    actividadOtraDetalle: '',
    temasTratados: '',
    facilitadorNombre: '',
  });
  const [materialTipo, setMaterialTipo] = useState('texto');
  const [materialPayload, setMaterialPayload] = useState({});
  const [preguntas, setPreguntas] = useState(emptyQuestions());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function preguntasValidas() {
    return preguntas.every(
      (p) => p.texto.trim() && p.opciones.every((o) => o.trim())
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.ciudad.trim() || !form.lugar.trim() || !form.fecha.trim()) {
      setError('Ciudad, lugar y fecha son requeridos');
      return;
    }
    if (!preguntasValidas()) {
      setError('Completa el texto y las 4 opciones de las 5 preguntas');
      return;
    }

    setSaving(true);
    try {
      const session = await api.createSession({ ...form, materialTipo, materialPayload });
      await api.setQuestions(session.id, preguntas);
      navigate(`/admin/sessions/${session.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/admin" className="text-slate-500 hover:text-slate-700 text-sm">
            ← Volver
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Nueva sesión de capacitación</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Código de formato</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={form.formatoCodigo}
                onChange={(e) => set('formatoCodigo', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fecha (DD/MM/AAAA)</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Ciudad</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={form.ciudad}
                onChange={(e) => set('ciudad', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Lugar</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={form.lugar}
                onChange={(e) => set('lugar', e.target.value)}
              />
            </div>
          </section>

          <section>
            <label className="block text-sm text-slate-600 mb-1">Actividad realizada</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={form.actividadTipo}
              onChange={(e) => set('actividadTipo', e.target.value)}
            >
              {ACTIVIDADES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            {form.actividadTipo === 'otra' && (
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-2"
                placeholder="¿Cuál?"
                value={form.actividadOtraDetalle}
                onChange={(e) => set('actividadOtraDetalle', e.target.value)}
              />
            )}
          </section>

          <section>
            <label className="block text-sm text-slate-600 mb-1">Temas tratados</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 h-24"
              value={form.temasTratados}
              onChange={(e) => set('temasTratados', e.target.value)}
            />
          </section>

          <section>
            <label className="block text-sm text-slate-600 mb-1">
              Técnico en SST / facilitador responsable
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={form.facilitadorNombre}
              onChange={(e) => set('facilitadorNombre', e.target.value)}
            />
          </section>

          <section>
            <MaterialEditor
              materialTipo={materialTipo}
              materialPayload={materialPayload}
              onChange={(tipo, payload) => {
                setMaterialTipo(tipo);
                setMaterialPayload(payload);
              }}
            />
          </section>

          <section>
            <h2 className="text-sm font-medium text-slate-700 mb-2">Quiz (5 preguntas)</h2>
            <QuestionEditor preguntas={preguntas} onChange={setPreguntas} />
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-5 py-2"
          >
            {saving ? 'Creando…' : 'Crear sesión'}
          </button>
        </form>
      </main>
    </div>
  );
}
