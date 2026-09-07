import { useState } from 'react';
import { api } from '../../lib/api.js';

export default function Quiz({ session, qrToken, participantToken, onAprobado, onBloqueado }) {
  const totalPreguntas = session.questions.length;
  const umbralPct = totalPreguntas === 10 ? 70 : 60;
  const [respuestas, setRespuestas] = useState(Array(session.questions.length).fill(null));
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const todasRespondidas = respuestas.every((r) => r !== null);

  function selectAnswer(qIndex, oIndex) {
    setRespuestas((prev) => prev.map((r, i) => (i === qIndex ? oIndex : r)));
  }

  function reintentar() {
    setRespuestas(Array(session.questions.length).fill(null));
    setResultado(null);
  }

  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      const data = await api.quizAttempt(qrToken, participantToken, respuestas);
      if (data.aprobado) {
        onAprobado({ aciertos: data.aciertos, totalPreguntas: data.totalPreguntas });
        return;
      }
      if (data.bloqueado) {
        onBloqueado();
        return;
      }
      setResultado(data);
    } catch (err) {
      if (err.status === 403 && err.data?.bloqueado) {
        onBloqueado();
      } else {
        setError(err.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold text-amber-600">
          {resultado.aciertos}/{resultado.totalPreguntas} — No alcanzaste el{' '}
          {resultado.totalPreguntas === 10 ? 70 : 60}% requerido
        </p>
        <p className="text-sm text-slate-600">
          Te quedan {resultado.intentosRestantes} intento(s). Vuelve a intentarlo.
        </p>
        <button
          onClick={reintentar}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg py-3"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Paso 2 de 5 · Evaluación: responde las {totalPreguntas} preguntas (mínimo {umbralPct}% para aprobar).
      </p>

      {session.questions.map((q, qIndex) => (
        <div key={q.id}>
          <p className="font-medium text-slate-800 mb-2">
            {qIndex + 1}. {q.texto}
          </p>
          <div className="space-y-1.5">
            {q.opciones.map((o, oIndex) => (
              <label
                key={oIndex}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${
                  respuestas[qIndex] === oIndex ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${qIndex}`}
                  checked={respuestas[qIndex] === oIndex}
                  onChange={() => selectAnswer(qIndex, oIndex)}
                />
                <span className="text-sm text-slate-700">{o}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={!todasRespondidas || enviando}
        onClick={enviar}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium rounded-lg py-3"
      >
        {enviando ? 'Enviando…' : 'Enviar respuestas'}
      </button>
    </div>
  );
}
