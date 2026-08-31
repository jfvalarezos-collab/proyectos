function emptyQuestion() {
  return { texto: '', opciones: ['', '', '', ''], respuestaCorrecta: 0 };
}

export function emptyQuestions() {
  return Array.from({ length: 5 }, emptyQuestion);
}

export default function QuestionEditor({ preguntas, onChange }) {
  function updateQuestion(index, patch) {
    const next = preguntas.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(next);
  }

  function updateOption(qIndex, oIndex, value) {
    const opciones = preguntas[qIndex].opciones.map((o, i) => (i === oIndex ? value : o));
    updateQuestion(qIndex, { opciones });
  }

  return (
    <div className="space-y-4">
      {preguntas.map((p, qIndex) => (
        <div key={qIndex} className="border border-slate-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Pregunta {qIndex + 1}
          </label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3"
            placeholder="Texto de la pregunta"
            value={p.texto}
            onChange={(e) => updateQuestion(qIndex, { texto: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {p.opciones.map((o, oIndex) => (
              <label key={oIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correcta-${qIndex}`}
                  checked={Number(p.respuestaCorrecta) === oIndex}
                  onChange={() => updateQuestion(qIndex, { respuestaCorrecta: oIndex })}
                />
                <input
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  placeholder={`Opción ${oIndex + 1}`}
                  value={o}
                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Marca el radio junto a la opción correcta.</p>
        </div>
      ))}
    </div>
  );
}
