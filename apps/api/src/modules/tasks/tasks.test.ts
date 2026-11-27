import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('TASK-001..004 : creation, liste, modification, progression et droits', async () => {
  const api = await startTestApi();
  try {
    const member = await api.login('stany'), other = await api.login('daniel'), admin = await api.login('admin');
    const body = { title: 'Test', assigneeId: 6, workDate: '2026-11-25' };
    assert.equal((await api.call('POST', '/tasks', { cookie: member, body: { ...body, assigneeId: 4 } })).status, 403);
    assert.equal((await api.call('POST', '/tasks', { cookie: member, body: { ...body, title: '' } })).status, 400);
    const created = await api.call('POST', '/tasks', { cookie: member, body });
    assert.equal(created.status, 200);
    assert.equal(created.json.assigneeId, 6);
    const id = created.json.id;
    assert.equal((await api.call('GET', '/tasks?from=2026-11-25&to=2026-11-25', { cookie: member })).status, 403);
    assert.ok((await api.call('GET', '/tasks/me?from=2026-11-25&to=2026-11-25', { cookie: member })).json.some((t: { id: number }) => t.id === id));
    assert.ok((await api.call('GET', '/tasks?from=2026-11-25&to=2026-11-25&userId=6', { cookie: admin })).json.some((t: { id: number }) => t.id === id));
    assert.equal((await api.call('PATCH', `/tasks/${id}`, { cookie: other, body: { title: 'Interdit' } })).status, 403);
    assert.equal((await api.call('PATCH', `/tasks/${id}`, { cookie: member, body: { title: 'Modifie' } })).json.title, 'Modifie');
    assert.equal((await api.call('POST', `/tasks/${id}/progress`, { cookie: other, body: { progress: 100, status: 'DONE' } })).status, 403);
    assert.equal((await api.call('POST', `/tasks/${id}/progress`, { cookie: member, body: { progress: 101, status: 'DONE' } })).status, 400);
    assert.equal((await api.call('POST', `/tasks/${id}/progress`, { cookie: member, body: { progress: 100, status: 'DONE' } })).json.progress, 100);
    assert.ok(api.ctx.db.prepare('SELECT completed_at FROM tasks WHERE id = ?').get(id)?.completed_at);
  } finally { await api.close(); }
});
