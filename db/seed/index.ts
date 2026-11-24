// SEED DETERMINISTE : memes IDs, memes lignes, memes hash sur toutes les machines.
// Interdits ici : Date.now(), new Date(), Math.random(), datetime('now').
// Un fichier par domaine, un proprietaire par fichier ; cet index est GELE (Daniel).
import { transaction, type Db } from '../lib.ts';
import { seedUsers } from './10_users.ts';
import { seedPresence } from './20_presence.ts';
import { seedAttendance } from './30_attendance.ts';
import { seedTasks } from './40_tasks.ts';
import { seedAgenda } from './50_agenda.ts';

export function seed(db: Db): void {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed de demonstration interdit en production.');
  transaction(db, () => { for (const run of [seedUsers, seedPresence, seedAttendance, seedTasks, seedAgenda]) run(db); });
}
