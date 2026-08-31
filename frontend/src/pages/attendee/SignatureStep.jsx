import { useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import SignatureCanvas from '../../components/SignatureCanvas.jsx';

export default function SignatureStep({ qrToken, participantToken, formData, onBack, onSuccess }) {
  const padRef = useRef(null);
  const [empty, setEmpty] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
  }

  function checkEmpty() {
    setEmpty(padRef.current?.isEmpty() ?? true);
  }

  async function enviar() {
    if (empty) return;
    setEnviando(true);
    setError('');
    try {
      const firmaPng = padRef.current.toDataURL();
      await api.submitAttendee(qrToken, { participantToken, ...formData, firmaPng });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Paso 4 de 5 · Firma</p>
      <p className="text-sm text-slate-600">
        {formData.nombre} · {formData.cedula} · {formData.cargo}
      </p>

      <div onPointerUp={checkEmpty} onMouseUp={checkEmpty} onTouchEnd={checkEmpty}>
        <SignatureCanvas ref={padRef} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={clear}
          className="flex-1 border border-slate-300 rounded-lg py-2 text-sm text-slate-600"
        >
          Borrar
        </button>
        <button
          onClick={onBack}
          className="flex-1 border border-slate-300 rounded-lg py-2 text-sm text-slate-600"
        >
          Atrás
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={empty || enviando}
        onClick={enviar}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium rounded-lg py-3"
      >
        {enviando ? 'Enviando…' : 'Enviar registro'}
      </button>
    </div>
  );
}
