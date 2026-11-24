import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerOf, outside } from './check-ownership.mjs';
test('chaque zone a la bonne personne', () => {
  assert.equal(ownerOf('apps/api/src/app.ts'), 'Daniel');
  assert.equal(ownerOf('apps/api/src/modules/tasks/index.ts'), 'Beoline');
  assert.equal(ownerOf('db/seed/30_attendance.ts'), 'Dancile');
  assert.equal(ownerOf('db/migrations/0001_init.sql'), 'Daniel');
  assert.equal(ownerOf('apps/web/src/features/team/index.tsx'), 'Abigael');
  assert.equal(ownerOf('apps/web/src/ui/tokens.css'), 'Francis');
  assert.equal(ownerOf('apps/web/vite.config.ts'), 'Alain');
});
test('un fichier hors zone est signale', () => {
  assert.deepEqual(outside('Stany', ['apps/agent/src/probe.ts', 'db/lib.ts']), [{ file: 'db/lib.ts', owner: 'Daniel' }]);
});
