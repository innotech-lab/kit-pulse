import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('JUS-001/002 : depot, doublon 409, traitement par RH, jamais sa propre justification', async () => {
  const api = await startTestApi();
  try {
    const rh = await api.login('rh'), member = await api.login('stany');
    const created = await api.call('POST', '/justifications', { cookie: member, body: { workDate: '2026-11-23', kind: 'ABSENCE', reason: 'Rendez-vous' } });
    assert.equal(created.status, 200);
    assert.equal(created.json.status, 'PENDING');
    assert.equal((await api.call('POST', '/justifications', { cookie: member, body: { workDate: '2026-11-23', kind: 'ABSENCE', reason: 'x' } })).status, 409);
    assert.ok((await api.call('GET', '/justifications/me', { cookie: member })).json.some((j: { id: number }) => j.id === created.json.id));
    assert.equal((await api.call('GET', '/justifications', { cookie: member })).status, 403);
    const own = await api.call('POST', '/justifications', { cookie: rh, body: { workDate: '2026-11-23', kind: 'LATE', reason: 'Moi' } });
    assert.equal((await api.call('POST', `/justifications/${own.json.id}/review`, { cookie: rh, body: { status: 'ACCEPTED' } })).status, 403);
    const ok = await api.call('POST', `/justifications/${created.json.id}/review`, { cookie: rh, body: { status: 'REJECTED', note: 'Pas de piece' } });
    assert.deepEqual([ok.status, ok.json.status, ok.json.reviewNote], [200, 'REJECTED', 'Pas de piece']);
    assert.equal((await api.call('POST', `/justifications/${created.json.id}/review`, { cookie: rh, body: { status: 'ACCEPTED' } })).status, 409);
    const audit = api.ctx.db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'JUSTIFICATION_REJECTED'").get() as { n: number };
    assert.equal(audit.n, 1);
  } finally { await api.close(); }
});
