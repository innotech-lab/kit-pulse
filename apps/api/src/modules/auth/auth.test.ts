import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('connexion, /me, deconnexion', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const cookie = await api.login('daniel');
  const me = await api.call('GET', '/auth/me', { cookie });
  assert.equal(me.json.badgeId, 'KH-004');
  assert.equal('password_hash' in me.json, false);
  await api.call('POST', '/auth/logout', { cookie });
  assert.equal((await api.call('GET', '/auth/me', { cookie })).status, 401);
});
test('un compte desactive perd immediatement son acces', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const cookie = await api.login('daniel');
  api.ctx.db.exec('UPDATE users SET is_active = 0 WHERE id = 4');
  assert.equal((await api.call('GET', '/auth/me', { cookie })).status, 401);
  assert.equal((await api.call('POST', '/auth/login', { body: { email: 'daniel@kitpulse.local', password: 'KitPulse-dev-2026' } })).status, 401);
});
test('blocage apres 8 echecs', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const bad = () => api.call('POST', '/auth/login', { body: { email: 'daniel@kitpulse.local', password: 'mauvais' } });
  for (let i = 0; i < 8; i++) assert.equal((await bad()).status, 401);
  assert.equal((await bad()).status, 429);
});
test('session expiree refusee', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const cookie = await api.login('daniel');
  api.setClock('2026-11-26T06:00:00.000Z');
  assert.equal((await api.call('GET', '/auth/me', { cookie })).status, 401);
});
