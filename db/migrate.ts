import { databaseFile, loadEnv, migrate, openDb } from './lib.ts';
loadEnv();
const done = migrate(openDb(databaseFile()));
console.log(done.length ? `Migrations appliquees : ${done.join(', ')}` : 'Base deja a jour.');
