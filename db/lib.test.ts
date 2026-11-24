import test from 'node:test';
import assert from 'node:assert/strict';
import { dataHash, migrate, openDb, schemaHash, verifyPassword } from './lib.ts';
import { seed } from './seed/index.ts';
import { SEED_PASSWORD } from './seed/10_users.ts';
const build = () => { const db = openDb(':memory:'); migrate(db); seed(db); return db; };

test('deux constructions donnent exactement la meme base', () => {
  const a = build(), b = build();
  assert.equal(schemaHash(a), schemaHash(b));
  assert.deepEqual(dataHash(a), dataHash(b));
});
test('migrer deux fois ne change rien', () => assert.deepEqual(migrate(build()), []));
test('mots de passe de seed verifiables et contraintes actives', () => {
  const db = build();
  const u = db.prepare('SELECT password_hash FROM users WHERE id = 1').get()!;
  assert.ok(verifyPassword(SEED_PASSWORD, u.password_hash as string));
  assert.ok(!verifyPassword('faux', u.password_hash as string));
  assert.throws(() => db.exec("UPDATE users SET role = 'DIEU' WHERE id = 1"));
  assert.throws(() => db.exec("INSERT INTO punches (user_id,type,at,work_date,source,created_by) VALUES (999,'IN','x','x','AGENT',1)"));
});
test('aucune MAC de routeur dans les donnees communes', () => {
  assert.equal(build().prepare('SELECT count(*) AS n FROM network_macs').get()!.n, 0);
});
