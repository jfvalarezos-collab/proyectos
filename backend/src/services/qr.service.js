import QRCode from 'qrcode';
import os from 'node:os';

export function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

export function buildSessionUrl(qrToken, frontendPort = 5173) {
  // Si hay una URL pública fija configurada (ej. el dominio de ngrok), se usa esa en
  // vez de la IP de la red local — así el QR/link funciona para cualquiera, no solo
  // para celulares conectados a la misma WiFi.
  const publicBase = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (publicBase) return `${publicBase}/s/${qrToken}`;

  const ip = getLanIp();
  return `http://${ip}:${frontendPort}/s/${qrToken}`;
}

export async function buildSessionQrDataUrl(qrToken, frontendPort = 5173) {
  const url = buildSessionUrl(qrToken, frontendPort);
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
  return { url, dataUrl };
}
