// Proprietaire : Beoline. Donnees FICTIVES.
import type { Db } from '../lib.ts';
const AT = '2026-11-25T06:00:00.000Z';
export function seedTasks(db: Db): void {
  const t = db.prepare('INSERT INTO tasks (id, title, assignee_id, created_by, priority, status, progress, work_date, due_date, created_at, updated_at, completed_at) VALUES (?,?,?,3,?,?,?,?,?,?,?,?)');
  t.run(1, 'Tache demo terminee', 4, 'NORMAL', 'DONE', 100, '2026-11-24', '2026-11-24', AT, AT, AT);
  t.run(2, 'Tache demo en cours', 5, 'HIGH', 'DOING', 40, '2026-11-25', '2026-11-26', AT, AT, null);
  t.run(3, 'Tache demo bloquee', 8, 'URGENT', 'BLOCKED', 20, '2026-11-25', '2026-11-25', AT, AT, null);
  t.run(4, 'Tache demo a faire', 9, 'LOW', 'TODO', 0, '2026-11-25', null, AT, AT, null);
  const a = db.prepare('INSERT INTO availability (user_id, status, note, updated_at) VALUES (?,?,?,?)');
  (['FREE', 'BUSY', 'MEETING', 'FIELD', 'FREE', 'OFFLINE', 'FREE'] as const).forEach((s, i) => a.run(4 + i, s, null, AT));
}
