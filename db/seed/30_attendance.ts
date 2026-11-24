// Proprietaire : Dancile. Donnees FICTIVES.
import type { Db } from '../lib.ts';
export function seedAttendance(db: Db): void {
  const j = db.prepare('INSERT INTO justifications (id, user_id, work_date, kind, reason, status, reviewed_by, reviewed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  j.run(1, 7, '2026-11-24', 'LATE', 'Motif fictif de demonstration', 'ACCEPTED', 2, '2026-11-24T10:00:00.000Z', '2026-11-24T08:00:00.000Z');
  j.run(2, 10, '2026-11-24', 'ABSENCE', 'Motif fictif de demonstration', 'ACCEPTED', 2, '2026-11-24T10:00:00.000Z', '2026-11-24T08:00:00.000Z');
  j.run(3, 6, '2026-11-24', 'LATE', 'Motif fictif de demonstration', 'PENDING', null, null, '2026-11-24T08:00:00.000Z');
}
