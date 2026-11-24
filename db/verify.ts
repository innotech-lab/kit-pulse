// Prouve que toutes les machines produisent la MEME base (schema + lignes de seed).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { databaseFile, dataHash, loadEnv, migrate, openDb, ROOT, schemaHash } from './lib.ts';
import { seed } from './seed/index.ts';
loadEnv();
const fresh = openDb(':memory:');
migrate(fresh); seed(fresh);
const data = dataHash(fresh);
const actual = { schema: schemaHash(fresh), data: data.hash, rows: data.rows };
const file = resolve(ROOT, 'db/fingerprint.json');
if (process.argv.includes('--write')) {
  writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
  console.log('Empreinte ecrite (Daniel uniquement).');
} else {
  const expected = JSON.parse(readFileSync(file, 'utf8')) as typeof actual;
  const problems: string[] = [];
  if (expected.schema !== actual.schema) problems.push('SCHEMA different de la reference');
  if (expected.data !== actual.data) problems.push('LIGNES de seed differentes de la reference');
  if (existsSync(databaseFile()) && schemaHash(openDb(databaseFile())) !== actual.schema) problems.push('La base locale est en retard : npm run db:reset');
  if (problems.length) { console.error('ECHEC\n- ' + problems.join('\n- ')); process.exit(1); }
  console.log(`OK : base identique a la reference (${actual.schema.slice(0, 12)} / ${actual.data.slice(0, 12)}).`);
}
