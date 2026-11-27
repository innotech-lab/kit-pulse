import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('AGD-001..003 : evenement personnel, droits et validation', async () => {
  const api = await startTestApi();
  try {
    const member = await api.login('stany'), other = await api.login('daniel'), admin = await api.login('admin');
    const body = { title: 'Reunion', kind: 'MEETING', startsAt: '2026-11-25T10:00:00.000Z', endsAt: '2026-11-25T11:00:00.000Z' };
    assert.equal((await api.call('POST', '/agenda', { cookie: member, body: { ...body, userId: 4 } })).status, 403);
    assert.equal((await api.call('POST', '/agenda', { cookie: member, body: { ...body, endsAt: body.startsAt } })).status, 400);
    const created = await api.call('POST', '/agenda', { cookie: member, body });
    assert.equal(created.status, 200);
    const id = created.json.id;
    assert.equal((await api.call('GET', '/agenda?from=2026-11-25&to=2026-11-25', { cookie: member })).status, 403);
    assert.ok((await api.call('GET', '/agenda/me?from=2026-11-25&to=2026-11-25', { cookie: member })).json.some((e: { id: number }) => e.id === id));
    assert.ok((await api.call('GET', '/agenda?from=2026-11-25&to=2026-11-25&userId=6', { cookie: admin })).json.some((e: { id: number }) => e.id === id));
    assert.equal((await api.call('PATCH', `/agenda/${id}`, { cookie: other, body: { title: 'Interdit' } })).status, 403);
    assert.equal((await api.call('PATCH', `/agenda/${id}`, { cookie: member, body: { title: 'Modifie' } })).json.title, 'Modifie');
    assert.equal((await api.call('DELETE', `/agenda/${id}`, { cookie: other })).status, 403);
    assert.equal((await api.call('DELETE', `/agenda/${id}`, { cookie: member })).status, 204);
    assert.equal((await api.call('DELETE', `/agenda/${id}`, { cookie: member })).status, 404);
  } finally { await api.close(); }
});
