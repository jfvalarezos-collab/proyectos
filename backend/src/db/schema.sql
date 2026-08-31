CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  formato_codigo TEXT NOT NULL DEFAULT 'FT-SST-02',
  ciudad TEXT NOT NULL DEFAULT '',
  lugar TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  actividad_tipo TEXT NOT NULL DEFAULT '',
  actividad_otra_detalle TEXT NOT NULL DEFAULT '',
  temas_tratados TEXT NOT NULL DEFAULT '',
  material_tipo TEXT NOT NULL DEFAULT 'texto',
  material_payload TEXT NOT NULL DEFAULT '{}',
  facilitador_nombre TEXT NOT NULL DEFAULT '',
  qr_token TEXT NOT NULL UNIQUE,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  opciones TEXT NOT NULL DEFAULT '["","","",""]',
  respuesta_correcta INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS content_progress (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_token TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  viewed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, participant_token)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_token TEXT NOT NULL,
  intento_numero INTEGER NOT NULL,
  respuestas TEXT NOT NULL DEFAULT '[]',
  aciertos INTEGER NOT NULL DEFAULT 0,
  aprobado INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_token TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cedula TEXT NOT NULL,
  cargo TEXT NOT NULL,
  firma_png TEXT NOT NULL,
  aciertos_aprobados INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_session_participant ON quiz_attempts(session_id, participant_token);
CREATE INDEX IF NOT EXISTS idx_attendees_session ON attendees(session_id);
