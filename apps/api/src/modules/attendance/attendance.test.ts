import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('Absence du jour apres la tolerance, puis retard au pointage', async () => {
  const api = await startTestApi();
  try {
    const member = await api.login('daniel');
    const getDay = async () => (await api.call('GET', '/attendance/me?from=2026-11-25&to=2026-11-25', { cookie: member })).json[0];
    api.setClock('2026-11-25T05:30:00.000Z');
    assert.equal((await getDay()).status, 'PENDING');
    api.setClock('2026-11-25T06:10:00.000Z');
    assert.equal((await getDay()).status, 'PENDING');
    api.setClock('2026-11-25T07:00:00.000Z');
    assert.equal((await getDay()).status, 'ABSENT');
    api.ctx.db.prepare("INSERT INTO justifications (user_id, work_date, kind, reason, status, created_at) VALUES (4, '2026-11-25', 'ABSENCE', 'Test', 'ACCEPTED', '2026-11-25T07:00:00.000Z')").run();
    assert.equal((await getDay()).justified, true);
    api.ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, simulated, source, created_by) VALUES (4, 'IN', '2026-11-25T07:05:00.000Z', '2026-11-25', 1, 'AGENT', 4)").run();
    api.setClock('2026-11-25T07:05:00.000Z');
    const day = await getDay();
    assert.deepEqual([day.status, day.minutesLate, day.justificationStatus], ['LATE', 65, null]);
  } finally { await api.close(); }
});

test('ATT-001/002 : seed du 24/11 conforme a la QA, equipe reservee ADMIN/HR', async () => {
  const api = await startTestApi();
  try {
    const rh = await api.login('rh');
    const r = await api.call('GET', '/attendance?from=2026-11-24&to=2026-11-24', { cookie: rh });
    assert.equal(r.status, 200);
    const by = Object.fromEntries(r.json.map((d: { userId: number }) => [d.userId, d]));
    assert.equal(by[5].status, 'PRESENT');            // 08:10 : limite de tolerance
    assert.deepEqual([by[6].status, by[6].minutesLate, by[6].justified], ['LATE', 11, false]);
    assert.deepEqual([by[7].status, by[7].justified], ['LATE', true]);
    assert.equal(by[8].missingOut, true);
    assert.deepEqual([by[9].status, by[9].justified], ['ABSENT', false]);
    assert.deepEqual([by[10].status, by[10].justified], ['ABSENT', true]);
    const member = await api.login('daniel');
    assert.equal((await api.call('GET', '/attendance?from=2026-11-24&to=2026-11-24', { cookie: member })).status, 403);
    const me = await api.call('GET', '/attendance/me?from=2026-11-23&to=2026-11-25', { cookie: member });
    assert.deepEqual(me.json.map((d: { status: string }) => d.status), ['PRESENT', 'PRESENT', 'PENDING']);
    assert.equal((await api.call('GET', '/attendance/me?from=2026-11-25&to=2026-11-01', { cookie: member })).status, 400);
  } finally { await api.close(); }
});

test('ATT-004 : jours feries du Burundi charges, jamais une absence, ajout reserve ADMIN/HR', async () => {
  const api = await startTestApi();
  try {
    const member = await api.login('daniel'), rh = await api.login('rh');
    const list = await api.call('GET', '/attendance/holidays?from=2026-01-01&to=2026-12-31', { cookie: member });
    assert.equal(list.status, 200);
    assert.ok(list.json.some((h: { date: string }) => h.date === '2026-07-01'));
    assert.ok(list.json.some((h: { date: string }) => h.date === '2026-11-02'), 'Toussaint reportee du dimanche au lundi');
    assert.equal(list.json.length, 15);
    assert.equal((await api.call('POST', '/attendance/holidays', { cookie: member, body: { date: '2026-12-26', label: 'Test' } })).status, 403);
    assert.equal((await api.call('POST', '/attendance/holidays', { cookie: rh, body: { date: '2026-03-20', label: 'Aïd el-Fitr' } })).status, 201);
    api.ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, simulated, source, created_by) VALUES (4,'IN','2026-04-01T06:00:00.000Z','2026-04-01',1,'AGENT',4)").run();
    const day = (await api.call('GET', '/attendance/me?from=2026-04-06&to=2026-04-06', { cookie: member })).json[0];
    assert.equal(day.status, 'HOLIDAY');
  } finally { await api.close(); }
});

test('Heures sup : avant 08:00, apres 17:00, les deux, seuil de 15 minutes, total dans le bilan', async () => {
  const api = await startTestApi();
  try {
    const p = api.ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, simulated, source, created_by) VALUES (?,?,?,?,1,'AGENT',?)");
    const day = (u: number, d: string, inn: string, out: string) => { p.run(u, 'IN', `${d}T${inn}:00.000Z`, d, u); p.run(u, 'OUT', `${d}T${out}:00.000Z`, d, u); };
    // UTC+2 : 05:00Z = 07:00 local, 17:30Z = 19:30 local
    day(4, '2026-11-16', '05:00', '15:00'); // arrive 07:00 -> 60 min avant
    day(4, '2026-11-17', '06:00', '17:30'); // part 19:30 -> 150 min apres
    day(4, '2026-11-18', '05:30', '16:00'); // les deux : 30 + 60
    day(4, '2026-11-19', '05:55', '15:10'); // 07:55 / 17:10 : sous le seuil
    const rh = await api.login('rh');
    const days = (await api.call('GET', '/attendance?from=2026-11-16&to=2026-11-19&userId=4', { cookie: rh })).json;
    assert.deepEqual(days.map((d: { minutesEarly: number; minutesAfter: number }) => [d.minutesEarly, d.minutesAfter]), [[60, 0], [0, 150], [30, 60], [0, 0]]);
    const rep = (await api.call('GET', '/reports/users/4?from=2026-11-16&to=2026-11-19', { cookie: rh })).json;
    assert.deepEqual([rep.overtimeMinutes, rep.overtimeDays], [300, 3]);
  } finally { await api.close(); }
});
