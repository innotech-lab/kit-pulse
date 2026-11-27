// Sauvegarde de la base : copie coherente (VACUUM INTO, sans arreter l'API), puis rotation.
// Usage : npm run db:backup            (dossier ./backups, 30 copies gardees)
//         BACKUP_DIR=/chemin BACKUP_KEEP=60 npm run db:backup
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { databaseFile, loadEnv, openDb, ROOT } from './lib.ts';

loadEnv();
const dir = resolve(ROOT, process.env.BACKUP_DIR || './backups');
const keep = Math.max(1, Number(process.env.BACKUP_KEEP || 30));
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = resolve(dir, `kit-pulse-${stamp}.db`);
const db = openDb(databaseFile());
try {
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
} finally {
  db.close();
}
// Verification : la copie s'ouvre et contient les comptes.
const copy = openDb(target);
const users = (copy.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
copy.close();

const old = readdirSync(dir).filter((f) => /^kit-pulse-.*\.db$/.test(f)).sort().reverse().slice(keep);
for (const f of old) rmSync(resolve(dir, f));
console.log(`Sauvegarde OK : ${target} (${Math.round(statSync(target).size / 1024)} Ko, ${users} comptes). ${old.length} ancienne(s) supprimee(s), ${keep} gardee(s) au maximum.`);
