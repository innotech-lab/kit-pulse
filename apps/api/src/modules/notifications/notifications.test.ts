import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';
import { notify } from '../../core/notify.ts';

test('notifications : ordre, limite, compteur et isolation entre comptes', async () => {
  const api = await startTestApi();
  try {
    const member = await api.login('daniel'), other = await api.login('stany');
    for (let i = 0; i < 55; i++) notify(api.ctx, [4], { kind: 'TASK_UPDATED', title: `Tâche ${i}`, link: '#tasks' });
    const list = await api.call('GET', '/notifications', { cookie: member });
    assert.equal(list.json.unread, 55); assert.equal(list.json.items.length, 50);
    const id = list.json.items[0].id;
    assert.equal((await api.call('POST', `/notifications/${id}/read`, { cookie: other })).status, 404);
    assert.equal((await api.call('POST', `/notifications/${id}/read`, { cookie: member })).status, 204);
    const next = await api.call('GET', '/notifications', { cookie: member });
    assert.equal(next.json.unread, 54); assert.equal(next.json.items.at(-1).id, id);
    assert.equal((await api.call('POST', `/notifications/${id}/read`, { cookie: member })).status, 204);
    assert.equal((await api.call('POST', '/notifications/read-all', { cookie: other })).status, 204);
    assert.equal((await api.call('GET', '/notifications', { cookie: member })).json.unread, 54);
    await api.call('POST', '/notifications/read-all', { cookie: member });
    assert.equal((await api.call('GET', '/notifications', { cookie: member })).json.unread, 0);
  } finally { await api.close(); }
});

test('notifications : attributions, modifications, justifications, refus, agenda et mot de passe', async () => {
  const api = await startTestApi();
  try {
    const admin = await api.login('admin'), rh = await api.login('rh'), member = await api.login('daniel');
    const task = await api.call('POST', '/tasks', { cookie: admin, body: { title: 'Travail', assigneeId: 4, workDate: '2026-11-25' } });
    assert.equal(task.status, 200);
    await api.call('PATCH', `/tasks/${task.json.id}`, { cookie: admin, body: { title: 'Travail modifié' } });
    const self = await api.call('POST', '/tasks', { cookie: member, body: { title: 'Ma tâche', assigneeId: 4, workDate: '2026-11-25' } });
    assert.equal(self.status, 200);
    const j = await api.call('POST', '/justifications', { cookie: member, body: { workDate: '2026-11-25', kind: 'ABSENCE', reason: 'Motif' } });
    assert.equal(j.status, 200);
    assert.equal((await api.call('POST', `/justifications/${j.json.id}/review`, { cookie: rh, body: { status: 'REJECTED', note: 'Précision requise' } })).status, 200);
    const event = await api.call('POST', '/agenda', { cookie: admin, body: { userId: 4, title: 'Réunion', kind: 'MEETING', startsAt: '2026-11-25T08:00:00.000Z', endsAt: '2026-11-25T09:00:00.000Z' } });
    assert.equal(event.status, 200);
    const punch = api.ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, source, created_by, review_status) VALUES (4, 'IN', '2026-11-25T06:00:00.000Z', '2026-11-25', 'AGENT', 4, 'PENDING')").run();
    assert.equal((await api.call('POST', `/presence/reviews/${punch.lastInsertRowid}`, { cookie: rh, body: { status: 'REJECTED', note: 'Photo illisible' } })).status, 200);
    let list = await api.call('GET', '/notifications', { cookie: member });
    const kinds = list.json.items.map((n: { kind: string }) => n.kind);
    for (const kind of ['TASK_ASSIGNED', 'TASK_UPDATED', 'JUSTIFICATION_DECIDED', 'AGENDA_EVENT_ADDED', 'ARRIVAL_REJECTED']) assert.ok(kinds.includes(kind), kind);
    assert.equal(kinds.filter((kind: string) => kind === 'TASK_ASSIGNED').length, 1);
    assert.equal(list.json.items.find((n: { kind: string }) => n.kind === 'ARRIVAL_REJECTED').body, 'Photo illisible');
    assert.ok((await api.call('GET', '/notifications', { cookie: admin })).json.items.some((n: { kind: string }) => n.kind === 'JUSTIFICATION_SUBMITTED'));
    assert.ok((await api.call('GET', '/notifications', { cookie: rh })).json.items.some((n: { kind: string }) => n.kind === 'JUSTIFICATION_SUBMITTED'));
    assert.equal((await api.call('POST', '/users/4/reset-password', { cookie: admin, body: { password: 'Temporaire-123' } })).status, 204);
    const relog = await api.call('POST', '/auth/login', { body: { email: 'daniel@kitpulse.local', password: 'Temporaire-123' } });
    assert.equal((await api.call('POST', '/auth/change-password', { cookie: relog.cookie, body: { current: 'Temporaire-123', next: 'Nouveau-secret-123' } })).status, 200);
    list = await api.call('GET', '/notifications', { cookie: relog.cookie });
    assert.ok(list.json.items.some((n: { kind: string }) => n.kind === 'PASSWORD_RESET'));
  } finally { await api.close(); }
});
