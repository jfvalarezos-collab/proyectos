// crypto.randomUUID() solo existe en "contextos seguros" (HTTPS, o http://localhost).
// Esta app se sirve por HTTP plano en la IP de la red WiFi (http://192.168.x.x:5173) para
// que los celulares puedan entrar sin certificados — eso NO es un contexto seguro, así que
// crypto.randomUUID está indefinido ahí y lanzaba un error que dejaba la pantalla en blanco
// sin ningún mensaje. Por eso generamos el id nosotros mismos como respaldo.
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getParticipantToken(qrToken) {
  const key = `sst_participant_${qrToken}`;
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = generateId();
    sessionStorage.setItem(key, token);
  }
  return token;
}
