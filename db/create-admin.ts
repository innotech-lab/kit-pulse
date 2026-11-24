// Premier compte admin en production (variables de la session, jamais dans .env) :
// ADMIN_BADGE, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD puis : npm run admin:create
import { databaseFile, hashPassword, loadEnv, migrate, openDb } from './lib.ts';
loadEnv();
const { ADMIN_BADGE, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
if (!ADMIN_BADGE || !ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
  console.error('Variables requises : ADMIN_BADGE, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD (10 caracteres minimum).');
  process.exit(1);
}
const db = openDb(databaseFile());
migrate(db);
const now = new Date().toISOString();
db.prepare("INSERT INTO users (badge_id, email, full_name, password_hash, role, must_change_password, created_at, updated_at) VALUES (?,?,?,?,'ADMIN',1,?,?)")
  .run(ADMIN_BADGE, ADMIN_EMAIL, ADMIN_NAME, hashPassword(ADMIN_PASSWORD), now, now);
console.log('Compte admin cree.');
