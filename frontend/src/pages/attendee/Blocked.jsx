export default function Blocked() {
  return (
    <div className="text-center space-y-3 py-6">
      <div className="text-4xl">🚫</div>
      <p className="text-lg font-semibold text-red-600">NO ACEPTABLE</p>
      <p className="text-sm text-slate-600">
        Agotaste los 3 intentos permitidos sin alcanzar el 60% requerido en el quiz.
      </p>
      <p className="text-sm text-slate-500">
        Debes repetir la capacitación completa. Contacta al facilitador para coordinar una nueva sesión.
      </p>
    </div>
  );
}
