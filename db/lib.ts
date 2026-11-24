import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export type Db = DatabaseSync;

export function loadEnv(): void {
  const file = resolve(ROOT, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}
export function databaseFile(): string {
  return resolve(ROOT, process.env.DATABASE_FILE || './data/kit-pulse.db');
}
export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  return db;
}
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try { const out = fn(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function migrate(db: Db, dir = resolve(ROOT, 'db/migrations')): string[] {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
  const done = new Map(db.prepare('SELECT name, checksum FROM schema_migrations').all().map((r) => [r.name as string, r.checksum as string]));
  const applied: string[] = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(name)) throw new Error(`Nom de migration invalide : ${name}`);
    // Fins de ligne normalisees : meme empreinte sous Windows et Linux.
    const sql = readFileSync(resolve(dir, name), 'utf8').replace(/\r\n/g, '\n');
    const known = done.get(name);
    if (known) {
      if (known !== sha(sql)) throw new Error(`${name} a ete modifiee apres application. Annuler la modification et creer une NOUVELLE migration.`);
      continue;
    }
    transaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(name, sha(sql));
    });
    applied.push(name);
  }
  return applied;
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const a = scryptSync(password, salt, 64), b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tables propres a chaque poste : hors de l'empreinte commune. */
const LOCAL_TABLES = new Set(['sessions', 'network_macs', 'punch_challenges']);
export function schemaHash(db: Db): string {
  const rows = db.prepare('SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name').all();
  return sha(JSON.stringify(rows.map((r) => [r.type, r.name, String(r.sql).replace(/\r\n/g, '\n')])));
}
export function dataHash(db: Db): { hash: string; rows: Record<string, number> } {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name as string);
  const rows: Record<string, number> = {};
  const out: unknown[] = [];
  for (const t of tables) {
    if (LOCAL_TABLES.has(t)) continue;
    const data = db.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all().map((r) => Object.entries(r));
    rows[t] = data.length;
    out.push([t, data]);
  }
  return { hash: sha(JSON.stringify(out)), rows };
}
