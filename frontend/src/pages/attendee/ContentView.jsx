import { useState } from 'react';
import ContentEmbed from '../../components/ContentEmbed.jsx';

export default function ContentView({ session, qrToken, participantToken, onContinue }) {
  const [viewed, setViewed] = useState(false);

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
      <button
        disabled={!viewed}
        onClick={onContinue}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3"
      >
        Continuar al quiz
      </button>
    </div>
  );
}
