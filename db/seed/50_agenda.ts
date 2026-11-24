// Proprietaire : Alain. Donnees FICTIVES.
import type { Db } from '../lib.ts';
export function seedAgenda(db: Db): void {
  const e = db.prepare('INSERT INTO events (id, user_id, title, kind, starts_at, ends_at, location, task_id, created_by) VALUES (?,?,?,?,?,?,?,?,?)');
  e.run(1, 7, 'Reunion demo', 'MEETING', '2026-11-25T07:00:00.000Z', '2026-11-25T08:00:00.000Z', 'Salle demo', null, 3);
  e.run(2, 5, 'Travail concentre demo', 'FOCUS', '2026-11-25T08:00:00.000Z', '2026-11-25T10:00:00.000Z', null, 2, 5);
  e.run(3, 8, 'Sortie terrain demo', 'FIELD', '2026-11-26T07:00:00.000Z', '2026-11-26T11:00:00.000Z', 'Site demo', null, 3);
}
