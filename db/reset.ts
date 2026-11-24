import { rmSync } from 'node:fs';
import { databaseFile, loadEnv, migrate, openDb } from './lib.ts';
import { seed } from './seed/index.ts';
loadEnv();
if (process.env.NODE_ENV === 'production') { console.error('REFUS : db:reset efface la base, interdit en production.'); process.exit(1); }
const file = databaseFile();
try { for (const s of ['', '-wal', '-shm']) rmSync(file + s, { force: true }); }
catch { console.error("Base verrouillee : arreter l'API (npm run dev:api) puis relancer."); process.exit(1); }
const db = openDb(file);
migrate(db); seed(db); db.close();
console.log(`Base recreee a l'identique : ${file}`);
