-- Arrivees avec photo, validees par les RH.
-- Une arrivee (IN) pointee par l'agent est PENDING jusqu'a la decision des RH ; elle compte deja,
-- a l'heure exacte du pointage. REJECTED = pointage annule (ignore par tous les calculs).
-- Les sorties et les corrections manuelles sont APPROVED d'office. Les pointages existants aussi.
ALTER TABLE punches ADD COLUMN review_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (review_status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE punches ADD COLUMN photo_file TEXT;
ALTER TABLE punches ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE punches ADD COLUMN reviewed_at TEXT;
ALTER TABLE punches ADD COLUMN review_note TEXT;
CREATE INDEX idx_punches_review ON punches(review_status, at);
