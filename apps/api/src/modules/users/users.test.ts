import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('USER-001 a 005 : creation, doublons 409, modification, desactivation coupe les sessions', async () => {
  const api = await startTestApi();
  try {
    const admin = await api.login('admin'), member = await api.login('stany');
    assert.equal((await api.call('GET', '/users/directory', { cookie: member })).status, 200);
    assert.equal((await api.call('GET', '/users', { cookie: member })).status, 403);
    const body = { badgeId: 'KH-099', email: 'nouveau@kitpulse.local', fullName: 'Nouveau', role: 'MEMBER', jobTitle: null, password: 'Mot-de-passe-1' };
    const created = await api.call('POST', '/users', { cookie: admin, body });
    assert.deepEqual([created.status, created.json.badgeId], [201, 'KH-099']);
    assert.equal((await api.call('POST', '/users', { cookie: admin, body: { ...body, email: 'autre@kitpulse.local' } })).status, 409);
    assert.equal((await api.call('POST', '/users', { cookie: member, body })).status, 403);
    const upd = await api.call('PATCH', `/users/${created.json.id}`, { cookie: admin, body: { badgeId: 'KH-100' } });
    assert.equal(upd.json.badgeId, 'KH-100');
    assert.equal((await api.call('POST', '/users/1/deactivate', { cookie: admin })).status, 400);
    assert.equal((await api.call('POST', '/users/6/deactivate', { cookie: admin })).json.isActive, false);
    assert.equal((await api.call('GET', '/users/directory', { cookie: member })).status, 401);
    assert.equal((await api.call('POST', '/users/6/activate', { cookie: admin })).json.isActive, true);
  } finally { await api.close(); }
});
