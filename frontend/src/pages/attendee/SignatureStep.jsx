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
    <div>
      {/* pb-40: espacio reservado para que el canvas no quede tapado detrás de la barra fija
          de botones de abajo. Es un valor fijo generoso, no depende de medir nada en tiempo
          real ni de window.innerHeight. */}
      <div className="pb-40">
        <div onPointerUp={checkEmpty} onMouseUp={checkEmpty} onTouchEnd={checkEmpty}>
          <SignatureCanvas ref={padRef} />
        </div>
      </div>

      {/* Barra de botones fija al fondo de la pantalla (position: fixed = anclada al viewport
          real del navegador, no al contenido). Siempre visible sin importar cuánto mida el
          canvas o el resto del contenido arriba — no depende de ningún cálculo de altura. */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-300 px-4 pt-3 space-y-2 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {error && <p className="text-sm text-red-600">{error}</p>}

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

        <button
          disabled={empty || enviando}
          onClick={enviar}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium rounded-lg py-3"
        >
          {enviando ? 'Enviando…' : 'Enviar registro'}
        </button>
      </div>
    </div>
  );
}
