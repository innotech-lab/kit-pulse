// Proprietaire : Stany. Donnees FICTIVES (lundi 23 et mardi 24 nov. 2026, UTC+2).
import type { Db } from '../lib.ts';
export function seedPresence(db: Db): void {
  const p = db.prepare("INSERT INTO punches (user_id, type, at, work_date, network_id, simulated, source, created_by) VALUES (?,?,?,?,1,1,'AGENT',?)");
  const day = (u: number, d: string, inn: string, out: string | null) => {
    p.run(u, 'IN', `${d}T${inn}:00.000Z`, d, u);
    if (out) p.run(u, 'OUT', `${d}T${out}:00.000Z`, d, u);
  };
  for (const u of [4, 5, 6, 7, 8, 9, 10]) day(u, '2026-11-23', '05:55', '15:02');
  day(4, '2026-11-24', '05:58', '15:00');
  day(5, '2026-11-24', '06:10', '15:00'); // 08:10 : pile a la limite de tolerance
  day(6, '2026-11-24', '06:11', '15:00'); // 08:11 : retard de 11 minutes
  day(7, '2026-11-24', '07:30', '15:00'); // retard justifie (voir 30_attendance)
  day(8, '2026-11-24', '05:50', null);    // sortie oubliee
  // 9 : absence sans justification ; 10 : absence justifiee
}
