import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('changement obligatoire : autres routes bloquees, verification et changement', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const cookie = await api.login('daniel');
  api.ctx.db.prepare('UPDATE users SET must_change_password = 1 WHERE id = 4').run();
  const blocked = await api.call('GET', '/tasks/me?from=2026-11-25&to=2026-11-25', { cookie });
  assert.equal(blocked.status, 403); assert.equal(blocked.json.error.code, 'MUST_CHANGE_PASSWORD');
  assert.equal((await api.call('GET', '/auth/me', { cookie })).status, 200);
  assert.equal((await api.call('POST', '/auth/change-password', { cookie, body: { current: 'incorrect', next: 'Nouveau-secret-123' } })).status, 401);
  assert.equal((await api.call('POST', '/auth/change-password', { cookie, body: { current: 'KitPulse-dev-2026', next: 'KitPulse-dev-2026' } })).status, 400);
  const changed = await api.call('POST', '/auth/change-password', { cookie, body: { current: 'KitPulse-dev-2026', next: 'Nouveau-secret-123' } });
  assert.equal(changed.json.mustChangePassword, false);
  assert.equal((await api.call('GET', '/tasks/me?from=2026-11-25&to=2026-11-25', { cookie })).status, 200);
});

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
