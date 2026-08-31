import 'dotenv/config';
import app from './app.js';
import { getLanIp } from './services/qr.service.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIp();
  console.log(`Backend escuchando en http://localhost:${PORT}`);
  console.log(`Accesible en la red WiFi en http://${ip}:${PORT}`);
});
