import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './config.ts';
import { localParts } from './time.ts';
test('options de developpement interdites en production', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', ALLOW_SIMULATED_NETWORK: 'true' }));
  assert.throws(() => loadConfig({ NODE_ENV: 'production', DEV_AUTO_APPROVE_DEVICES: 'true' }));
  assert.equal(loadConfig({ NODE_ENV: 'production' }).allowSimulated, false);
});
test('le jour de travail est local, pas UTC', () => {
  assert.deepEqual(localParts(new Date('2026-11-24T22:30:00Z'), 'Africa/Bujumbura'), { date: '2026-11-25', time: '00:30', weekday: 3 });
});
