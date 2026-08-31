// Validación de cédula ecuatoriana: 10 dígitos, provincia válida (01-24 o 30 para extranjeros),
// tercer dígito < 6, y dígito verificador por algoritmo módulo 10.
export function validarCedulaEcuatoriana(cedula) {
  if (typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) return false;

  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;

  const tercerDigito = Number(cedula[2]);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = Number(cedula[i]) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }
  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === Number(cedula[9]);
}
