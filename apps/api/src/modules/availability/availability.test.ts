import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('AVL-001/002 : valeurs par defaut, mise a jour personnelle et validation', async () => {
  const api = await startTestApi();
  try {
    const member = await api.login('stany');
    api.ctx.db.prepare('DELETE FROM availability WHERE user_id = ?').run(6);
    const list = await api.call('GET', '/availability', { cookie: member });
    assert.equal(list.status, 200);
    assert.equal(list.json.find((a: { userId: number }) => a.userId === 6).status, 'FREE');
    assert.equal((await api.call('PUT', '/availability/me', { cookie: member, body: { status: 'INVALID' } })).status, 400);
    const updated = await api.call('PUT', '/availability/me', { cookie: member, body: { status: 'BUSY', note: 'Travail' } });
    assert.deepEqual([updated.status, updated.json.userId, updated.json.status], [200, 6, 'BUSY']);
    assert.equal((await api.call('GET', '/availability', { cookie: member })).json.find((a: { userId: number }) => a.userId === 6).note, 'Travail');
  } finally { await api.close(); }
});
