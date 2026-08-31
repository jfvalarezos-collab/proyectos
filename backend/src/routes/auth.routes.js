import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req, res) => {
  const { usuario, password } = req.body ?? {};
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  const adminUser = process.env.ADMIN_USER;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUser || !adminHash) {
    return res.status(500).json({
      error: 'El servidor no tiene configurado ADMIN_USER / ADMIN_PASSWORD_HASH en el .env',
    });
  }

  if (usuario !== adminUser || !bcrypt.compareSync(password, adminHash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, usuario });
});

export default router;
