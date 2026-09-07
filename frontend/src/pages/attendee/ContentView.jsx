import { useEffect, useRef, useState } from 'react';
import ContentEmbed from '../../components/ContentEmbed.jsx';

export default function ContentView({ session, qrToken, participantToken, onContinue }) {
  const [viewed, setViewed] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    // Cuando el contenido queda marcado como visto, el botón de continuar puede quedar fuera
    // de la pantalla en celular (el usuario suele estar con el scroll a mitad del contenido) y
    // nada más avisa que ya puede avanzar. Lo llevamos a la vista automáticamente.
    if (viewed) buttonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [viewed]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Paso 1 de 5 · Revisa todo el contenido antes de continuar.
      </p>
      <ContentEmbed
        materialTipo={session.materialTipo}
        materialPayload={session.materialPayload}
        qrToken={qrToken}
        participantToken={participantToken}
        onViewed={() => setViewed(true)}
      />
      {!viewed && (
        <p className="text-xs text-slate-400 text-center">
          Cuando termines de ver el contenido, aparecerá aquí el botón para continuar.
        </p>
      )}
      {/* Único punto de continuación del paso 1, sin importar el tipo de material (PDF, video,
          PowerPoint convertido, imágenes): antes convivía con un botón interno casi idéntico
          dentro del visor de texto/documento, y varios trabajadores hacían clic ahí sin darse
          cuenta de que debían bajar y hacer clic otra vez acá. Ahora solo existe este botón, y
          además solo aparece (no solo se habilita) cuando el contenido queda marcado como visto,
          para que el cambio de estado sea imposible de pasar por alto. */}
      {viewed && (
        <div
          ref={buttonRef}
          className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-4 text-center space-y-3"
        >
          <p className="text-base font-semibold text-emerald-800">✅ Contenido completo</p>
          <button
            onClick={onContinue}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white text-lg font-bold rounded-xl py-4 shadow-lg animate-pulse"
          >
            Continuar a la evaluación →
          </button>
        </div>
      )}
    </div>
  );
}
