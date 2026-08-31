export default function Success({ resultado }) {
  return (
    <div className="text-center space-y-3 py-6">
      <div className="text-4xl">✅</div>
      <p className="text-lg font-semibold text-slate-800">¡Registro enviado!</p>
      {resultado && (
        <p className="text-sm text-slate-600">
          Aprobaste el quiz con {resultado.aciertos}/{resultado.totalPreguntas} respuestas correctas.
        </p>
      )}
      <p className="text-sm text-slate-500">Gracias por completar la capacitación.</p>
    </div>
  );
}
