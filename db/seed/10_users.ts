// Proprietaire : Daniel. Comptes de DEVELOPPEMENT uniquement.
import { createHash } from 'node:crypto';
import { hashPassword, type Db } from '../lib.ts';
export const SEED_PASSWORD = 'KitPulse-dev-2026';
const AT = '2026-11-25T06:00:00.000Z';
const rows: [number, string, string, string, string, string][] = [
  [1, 'KH-001', 'admin@kitpulse.local', 'Admin Demo', 'ADMIN', 'Compte de demonstration'],
  [2, 'KH-002', 'rh@kitpulse.local', 'RH Demo', 'HR', 'Compte de demonstration'],
  [3, 'KH-003', 'coordination@kitpulse.local', 'Coordination Demo', 'COORDINATOR', 'Compte de demonstration'],
  [4, 'KH-004', 'daniel@kitpulse.local', 'Daniel', 'MEMBER', 'Backend'],
  [5, 'KH-005', 'dancile@kitpulse.local', 'Dancile', 'MEMBER', 'Backend'],
  [6, 'KH-006', 'stany@kitpulse.local', 'Stany', 'MEMBER', 'Backend'],
  [7, 'KH-007', 'alain@kitpulse.local', 'Alain', 'MEMBER', 'Fullstack'],
  [8, 'KH-008', 'beoline@kitpulse.local', 'Beoline', 'MEMBER', 'Backend'],
  [9, 'KH-009', 'abigael@kitpulse.local', 'Abigael', 'MEMBER', 'UI'],
  [10, 'KH-010', 'francis@kitpulse.local', 'Francis', 'MEMBER', 'Expert UI-UX'],
];
export function seedUsers(db: Db): void {
  const insert = db.prepare('INSERT INTO users (id, badge_id, email, full_name, role, job_title, password_hash, must_change_password, created_at, updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)');
  for (const [id, badge, email, name, role, job] of rows) {
    const salt = createHash('sha256').update(`kit-pulse-seed:${badge}`).digest('hex').slice(0, 32);
    insert.run(id, badge, email, name, role, job, hashPassword(SEED_PASSWORD, salt), AT, AT);
  }
}
