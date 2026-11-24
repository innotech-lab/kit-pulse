import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNetwork, normalizeMac, type KnownNetwork } from './network.ts';

// MAC de test localement administrees (02:...), sans rapport avec KIT-HUB.
const A = '02:00:00:00:00:0a', B = '02:00:00:00:00:0b', RADIO = '02:00:00:00:00:1a';
const nets: KnownNetwork[] = [
  { id: 1, ssid: 'KIT-HUB_Starlink', gatewayMacs: [A], bssids: [RADIO] },
  { id: 2, ssid: 'Kit-Hub3', gatewayMacs: [B], bssids: [] },
];
const r = (gatewayMac: string | null, ssid: string | null, bssid: string | null = null) => ({ gatewayMac, ssid, bssid, simulated: false });

test('normalise les formats et refuse les adresses impossibles', () => {
  assert.equal(normalizeMac('02-00-00-00-00-0A'), A);
  assert.equal(normalizeMac('0200.0000.000a'), A);
  for (const bad of ['', 'xx', '00:00:00:00:00:00', 'ff:ff:ff:ff:ff:ff', '01:00:5e:00:00:01']) assert.equal(normalizeMac(bad), null);
});
test('accepte la MAC du routeur sur le bon reseau', () => {
  assert.deepEqual(checkNetwork(r(A, 'KIT-HUB_Starlink'), nets, 'gateway'), { ok: true, networkId: 1 });
  assert.deepEqual(checkNetwork(r(B, null), nets, 'gateway'), { ok: true, networkId: 2 });
});
test('un faux Wi-Fi portant le bon nom est refuse', () => {
  assert.deepEqual(checkNetwork(r('02:00:00:00:00:98', 'Kit-Hub3'), nets, 'gateway'), { ok: false, reason: 'GATEWAY_MAC_UNKNOWN' });
});
test('MAC connue mais SSID different : refuse', () => {
  assert.deepEqual(checkNetwork(r(A, 'Kit-Hub3'), nets, 'gateway'), { ok: false, reason: 'SSID_MISMATCH' });
});
test('MAC illisible : refuse', () => {
  assert.deepEqual(checkNetwork(r(null, 'Kit-Hub3'), nets, 'gateway'), { ok: false, reason: 'GATEWAY_MAC_UNREADABLE' });
});
test('aucune MAC configuree : refus par defaut', () => {
  const empty = nets.map((n) => ({ ...n, gatewayMacs: [] }));
  assert.deepEqual(checkNetwork(r(A, 'Kit-Hub3'), empty, 'gateway'), { ok: false, reason: 'NETWORK_NOT_CONFIGURED' });
});
test('mode strict : BSSID obligatoire et connu', () => {
  assert.deepEqual(checkNetwork(r(A, 'KIT-HUB_Starlink'), nets, 'strict'), { ok: false, reason: 'BSSID_REQUIRED' });
  assert.deepEqual(checkNetwork(r(A, 'KIT-HUB_Starlink', '02:00:00:00:00:76'), nets, 'strict'), { ok: false, reason: 'BSSID_UNKNOWN' });
  assert.deepEqual(checkNetwork(r(A, 'KIT-HUB_Starlink', RADIO), nets, 'strict'), { ok: true, networkId: 1 });
});
