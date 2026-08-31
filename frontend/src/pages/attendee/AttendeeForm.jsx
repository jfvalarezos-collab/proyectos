import { useState } from 'react';
import { validarCedulaEcuatoriana } from '../../lib/cedula.js';

export default function AttendeeForm({ initial, onNext }) {
  const [nombre, setNombre] = useState(initial.nombre);
  const [cedula, setCedula] = useState(initial.cedula);
  const [cargo, setCargo] = useState(initial.cargo);
  const [touched, setTouched] = useState(false);

  const cedulaValida = validarCedulaEcuatoriana(cedula);
  const valido = nombre.trim().length > 2 && cedulaValida && cargo.trim().length > 1;

  function onSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valido) return;
    onNext({ nombre: nombre.trim(), cedula, cargo: cargo.trim() });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-slate-500">Paso 3 de 5 · Tus datos</p>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Nombre completo</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Número de cédula</label>
        <input
          inputMode="numeric"
          maxLength={10}
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          value={cedula}
          onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
        />
        {touched && !cedulaValida && (
          <p className="text-xs text-red-600 mt-1">Cédula ecuatoriana inválida (10 dígitos).</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Cargo</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg py-3"
      >
        Continuar a la firma
      </button>
    </form>
  );
}
