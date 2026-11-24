-- SCHEMA COMMUN. Fichier GELE : on n'edite jamais une migration deja partagee.
-- Dates-heures en UTC ISO-8601 ; work_date = date locale (APP_TIMEZONE).
CREATE TABLE users (
  id INTEGER PRIMARY KEY, badge_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','HR','COORDINATOR','MEMBER')),
  job_title TEXT, is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, expires_at TEXT NOT NULL
) STRICT;
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE TABLE networks (id INTEGER PRIMARY KEY, ssid TEXT NOT NULL UNIQUE, label TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1) STRICT;
CREATE TABLE network_macs (
  id INTEGER PRIMARY KEY, network_id INTEGER NOT NULL REFERENCES networks(id),
  kind TEXT NOT NULL CHECK (kind IN ('GATEWAY','BSSID')), mac TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ENV','ADMIN')), note TEXT, UNIQUE (network_id, kind, mac)
) STRICT;
CREATE TABLE devices (
  id INTEGER PRIMARY KEY, key_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'PERSONAL' CHECK (kind IN ('PERSONAL','KIOSK')),
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REVOKED')),
  created_at TEXT NOT NULL, reviewed_by INTEGER REFERENCES users(id), reviewed_at TEXT
) STRICT;
CREATE TABLE punch_challenges (
  nonce TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), type TEXT NOT NULL CHECK (type IN ('IN','OUT')),
  expires_at TEXT NOT NULL, used_at TEXT
) STRICT;
CREATE TABLE punches (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), type TEXT NOT NULL CHECK (type IN ('IN','OUT')),
  at TEXT NOT NULL, work_date TEXT NOT NULL, network_id INTEGER REFERENCES networks(id), device_id INTEGER REFERENCES devices(id),
  gateway_mac TEXT, bssid TEXT, ssid TEXT, ip TEXT, simulated INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('AGENT','MANUAL')), reason TEXT, created_by INTEGER NOT NULL REFERENCES users(id),
  CHECK (source = 'AGENT' OR reason IS NOT NULL)
) STRICT;
CREATE INDEX idx_punches_user_day ON punches(user_id, work_date);
CREATE TABLE punch_rejections (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), at TEXT NOT NULL, reason TEXT NOT NULL,
  device_key_id TEXT, gateway_mac TEXT, bssid TEXT, ssid TEXT, ip TEXT
) STRICT;
CREATE TABLE work_schedule (
  weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 1 AND 7), start_time TEXT NOT NULL, end_time TEXT NOT NULL, grace_minutes INTEGER NOT NULL
) STRICT;
CREATE TABLE holidays (date TEXT PRIMARY KEY, label TEXT NOT NULL) STRICT;
CREATE TABLE justifications (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), work_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('LATE','ABSENCE')), reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
  reviewed_by INTEGER REFERENCES users(id), review_note TEXT, reviewed_at TEXT, created_at TEXT NOT NULL,
  UNIQUE (user_id, work_date, kind)
) STRICT;
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT, assignee_id INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id), priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO','DOING','BLOCKED','DONE','CANCELLED')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  work_date TEXT NOT NULL, due_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT
) STRICT;
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id, work_date);
CREATE TABLE task_updates (
  id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id), user_id INTEGER NOT NULL REFERENCES users(id),
  progress INTEGER NOT NULL, status TEXT NOT NULL, note TEXT, at TEXT NOT NULL
) STRICT;
CREATE TABLE availability (
  user_id INTEGER PRIMARY KEY REFERENCES users(id), status TEXT NOT NULL CHECK (status IN ('FREE','BUSY','MEETING','FIELD','OFFLINE')),
  note TEXT, until TEXT, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE events (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('MEETING','FIELD','FOCUS','OTHER')), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  location TEXT, task_id INTEGER REFERENCES tasks(id), created_by INTEGER NOT NULL REFERENCES users(id), CHECK (starts_at < ends_at)
) STRICT;
CREATE INDEX idx_events_user ON events(user_id, starts_at);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail TEXT, at TEXT NOT NULL
) STRICT;
-- Donnees de reference (dev ET production). Les MAC ne sont PAS ici : elles viennent de .env ou de l'admin.
INSERT INTO networks (id, ssid, label) VALUES (1, 'KIT-HUB_Starlink', 'Reseau 1'), (2, 'Kit-Hub3', 'Reseau 2');
-- HYPOTHESE a confirmer par KIT-HUB : lundi-vendredi 08:00-17:00, tolerance 10 minutes.
INSERT INTO work_schedule VALUES (1,'08:00','17:00',10),(2,'08:00','17:00',10),(3,'08:00','17:00',10),(4,'08:00','17:00',10),(5,'08:00','17:00',10);
