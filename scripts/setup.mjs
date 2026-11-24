// Premiere installation d'un poste : npm run setup (apres npm ci).
import { copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 18)) { console.error(`Node ${process.versions.node} trop ancien. Installer Node 24 LTS.`); process.exit(1); }
if (existsSync(resolve(root, '.env'))) console.log('.env existe deja : conserve.');
else { copyFileSync(resolve(root, '.env.example'), resolve(root, '.env')); console.log('.env cree depuis .env.example.'); }
for (const f of ['db/reset.ts', 'db/verify.ts']) execFileSync(process.execPath, [f], { cwd: root, stdio: 'inherit' });
