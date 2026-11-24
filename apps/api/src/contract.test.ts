import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES } from '@kit-pulse/contracts';
import { startTestApi } from './testing.ts';

test('toutes les routes du contrat sont montees et protegees', async (t) => {
  const api = await startTestApi();
  t.after(() => api.close());
  const member = await api.login('daniel');
  for (const r of ROUTES) {
    const path = `/${r.module}${r.path === '/' ? '' : r.path}`.replace(/:\w+/g, '999999');
    const label = `${r.method.toUpperCase()} ${path}`;
    const anonymous = await api.call(r.method.toUpperCase(), path, { ...(r.method === 'get' ? {} : { body: {} }) });
    if (r.roles === 'PUBLIC') { assert.notEqual(anonymous.status, 404, label); continue; }
    assert.equal(anonymous.status, 401, label);
    if (r.roles !== 'ALL') {
      const res = await api.call(r.method.toUpperCase(), path, { cookie: member, ...(r.method === 'get' ? {} : { body: {} }) });
      assert.equal(res.status, 403, label);
    }
  }
  assert.equal((await api.call('GET', '/inconnu')).status, 404);
});
test('une ecriture sans en-tete X-KitPulse est refusee', async (t) => {
  const api = await startTestApi();
  t.after(() => api.close());
  assert.equal((await api.call('POST', '/auth/login', { body: {}, headers: { 'x-kitpulse': '' } })).status, 403);
});
