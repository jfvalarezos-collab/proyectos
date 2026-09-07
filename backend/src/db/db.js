// Usamos el módulo nativo node:sqlite (incluido desde Node 22+, estable en esta versión)
// en vez de better-sqlite3: better-sqlite3 requiere compilar un binario nativo con
// node-gyp/Python, lo que falla en Windows si no hay Python/Visual Studio Build Tools
// instalados. node:sqlite viene listo para usar sin dependencias nativas externas.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'app.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Migración aditiva para bases de datos creadas antes de que existiera esta columna:
// CREATE TABLE IF NOT EXISTS no altera tablas ya existentes.
const sessionCols = db.prepare("PRAGMA table_info(sessions)").all();
if (!sessionCols.some((c) => c.name === 'num_preguntas')) {
  db.exec('ALTER TABLE sessions ADD COLUMN num_preguntas INTEGER NOT NULL DEFAULT 5');
}

// Pequeño helper para imitar la API de transacciones de better-sqlite3, usada en las rutas.
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

export default db;
