import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApi } from '../../testing.ts';

test('REP-001/002 : chiffres identiques aux journees, periode vide a zero, interdit au MEMBER', async () => {
  const api = await startTestApi();
  try {
    const rh = await api.login('rh'), member = await api.login('abigael');
    const team = await api.call('GET', '/reports/team?from=2026-11-23&to=2026-11-24', { cookie: rh });
    const abi = team.json.find((p: { userId: number }) => p.userId === 9);
    assert.deepEqual([abi.expectedDays, abi.presentDays, abi.absentUnjustified], [2, 1, 1]);
    const empty = await api.call('GET', '/reports/me?from=2020-01-01&to=2020-01-31', { cookie: member });
    assert.deepEqual([empty.status, empty.json.expectedDays, empty.json.averageProgress], [200, 0, 0]);
    assert.equal((await api.call('GET', '/reports/users/9?from=2026-11-23&to=2026-11-24', { cookie: member })).status, 403);
    assert.equal((await api.call('GET', '/reports/users/9?from=2026-11-23&to=2026-11-24', { cookie: rh })).json.presentDays, 1);
  } finally { await api.close(); }
});
