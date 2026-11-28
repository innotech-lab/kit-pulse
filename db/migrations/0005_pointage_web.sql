-- V2 : pointage sans agent (voir docs/PLAN-V2-POINTAGE-WEB.md).
-- Appareils reconnus par le navigateur, passkeys, empreintes faciales, lieu du KiT Hub, indices d'arrivee, notifications.

-- Appareil web : cle ECDSA P-256 non extractible creee par le navigateur, independante du compte connecte.
-- Un appareil appartient a un seul compte (owner) ; un compte peut en avoir plusieurs.
CREATE TABLE web_devices (
  id INTEGER PRIMARY KEY, key_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, owner_id INTEGER NOT NULL REFERENCES users(id),
  label TEXT NOT NULL, fingerprint TEXT, status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REVOKED')),
  created_at TEXT NOT NULL, last_seen_at TEXT, reviewed_by INTEGER REFERENCES users(id), reviewed_at TEXT
) STRICT;
CREATE INDEX idx_web_devices_owner ON web_devices(owner_id);
CREATE INDEX idx_web_devices_fingerprint ON web_devices(fingerprint);

-- Passkey (WebAuthn) liee a un appareil et a son proprietaire.
CREATE TABLE device_passkeys (
  id INTEGER PRIMARY KEY, device_id INTEGER NOT NULL REFERENCES web_devices(id), user_id INTEGER NOT NULL REFERENCES users(id),
  credential_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, sign_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
) STRICT;

-- Empreinte faciale (vecteur, pas de photo). Enregistree chez l'admin avec consentement ; supprimee a la desactivation.
CREATE TABLE face_templates (
  user_id INTEGER PRIMARY KEY REFERENCES users(id), embedding BLOB NOT NULL, model TEXT NOT NULL, samples INTEGER NOT NULL,
  consent_at TEXT NOT NULL, enrolled_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
) STRICT;

-- Lieu du KiT Hub (vide = non configure : la verification du lieu est alors « non configuree »).
INSERT INTO settings (key, value) VALUES ('site_lat', ''), ('site_lng', ''), ('site_radius_m', '100');

-- Indices d'arrivee montres a la RH.
ALTER TABLE punches ADD COLUMN web_device_id INTEGER REFERENCES web_devices(id);
ALTER TABLE punches ADD COLUMN device_verdict TEXT CHECK (device_verdict IN ('OWN','OTHER','LIKE_OTHER','UNKNOWN')); -- OTHER = appareil d'un collegue
ALTER TABLE punches ADD COLUMN device_other_user_id INTEGER REFERENCES users(id);
ALTER TABLE punches ADD COLUMN private_mode INTEGER CHECK (private_mode IN (0,1));
ALTER TABLE punches ADD COLUMN face_verdict TEXT CHECK (face_verdict IN ('MATCH','NO_MATCH','NO_FACE','NO_TEMPLATE','LIVENESS_FAIL','UNAVAILABLE'));
ALTER TABLE punches ADD COLUMN face_score REAL;
ALTER TABLE punches ADD COLUMN geo_verdict TEXT CHECK (geo_verdict IN ('INSIDE','OUTSIDE','DENIED','UNAVAILABLE','NOT_CONFIGURED'));
ALTER TABLE punches ADD COLUMN geo_lat REAL;
ALTER TABLE punches ADD COLUMN geo_lng REAL;
ALTER TABLE punches ADD COLUMN geo_accuracy_m REAL;
ALTER TABLE punches ADD COLUMN geo_distance_m REAL;

-- Notifications personnelles (cloche).
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), kind TEXT NOT NULL, title TEXT NOT NULL,
  body TEXT, link TEXT, created_at TEXT NOT NULL, read_at TEXT
) STRICT;
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at);
