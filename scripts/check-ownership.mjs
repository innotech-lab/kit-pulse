// npm run owner:check -- Daniel            compare la branche a origin/develop (lecture seule)
// npm run owner:check -- Daniel --files a b   verifie une liste de fichiers (sans Git)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { _: _note, ...OWNERS } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'ownership.json'), 'utf8'));
const match = (pattern, file) => {
  const i = pattern.indexOf('*');
  return i < 0 ? file === pattern : file.startsWith(pattern.slice(0, i)) && file.endsWith(pattern.slice(i + 1));
};
export function ownerOf(file) {
  let best = null;
  for (const [owner, patterns] of Object.entries(OWNERS)) for (const p of patterns) if (match(p, file) && (!best || p.length > best.len)) best = { owner, len: p.length };
  return best?.owner ?? null;
}
export const outside = (who, files) => files.filter((f) => ownerOf(f) !== who).map((f) => ({ file: f, owner: ownerOf(f) ?? 'PERSONNE' }));
export const names = Object.keys(OWNERS);

if (import.meta.main ?? process.argv[1]?.endsWith('check-ownership.mjs')) {
  const [who, flag, ...rest] = process.argv.slice(2);
  if (!names.includes(who)) { console.error(`Usage : npm run owner:check -- <${names.join('|')}>`); process.exit(2); }
  const files = flag === '--files' ? rest : execFileSync('git', ['diff', '--name-only', 'origin/develop...HEAD'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const bad = outside(who, files);
  if (bad.length) { console.error('Fichiers hors de ta zone (demander a la personne indiquee) :\n' + bad.map((b) => `- ${b.file} -> ${b.owner}`).join('\n')); process.exit(1); }
  console.log(`OK : ${files.length} fichier(s), tous dans la zone de ${who}.`);
}
