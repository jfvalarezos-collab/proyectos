import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, clearAdminToken } from '../../lib/api.js';

export default function Dashboard() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listSessions()
      .then(setSessions)
      .catch((err) => setError(err.message));
  }, []);

  function logout() {
    clearAdminToken();
    navigate('/admin/login');
  }

  async function handleBackup() {
    setBackingUp(true);
    setError('');
    try {
      const { blob, filename } = await api.downloadDatabaseBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Sesiones de Capacitación</h1>
          <div className="flex gap-3">
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="text-sm text-slate-600 hover:text-slate-800 disabled:opacity-60 border border-slate-300 px-4 py-2 rounded-lg"
            >
              {backingUp ? 'Descargando…' : 'Respaldo de base de datos'}
            </button>
            <Link
              to="/admin/sessions/new"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              + Nueva sesión
            </Link>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700 px-2">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {!sessions && !error && <p className="text-slate-500">Cargando…</p>}
        {sessions?.length === 0 && (
          <p className="text-slate-500">No hay sesiones todavía. Crea la primera.</p>
        )}

        <div className="grid gap-3">
          {sessions?.map((s) => (
            <Link
              key={s.id}
              to={`/admin/sessions/${s.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-brand-500 transition"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {s.temas_tratados || '(Sin tema definido)'}
                </p>
                <p className="text-sm text-slate-500">
                  {s.ciudad} · {s.lugar} · {s.fecha}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">{s.total_asistentes} asistentes</p>
                <p className="text-xs text-slate-400">{s.published ? 'Abierta' : 'Cerrada'}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
