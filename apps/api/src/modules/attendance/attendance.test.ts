import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

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
