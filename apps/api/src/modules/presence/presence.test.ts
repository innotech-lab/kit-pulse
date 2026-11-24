import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { attestationPayload, SIMULATED_GATEWAY_MAC, type Attestation } from '@kit-pulse/contracts';
import { syncNetworksFromEnv } from '../../core/networks.ts';
import { startTestApi } from '../../testing.ts';

// MAC de test localement administrees, sans rapport avec les routeurs KIT-HUB.
const ROUTER = '02:00:00:00:00:0a';
const ENV = { KITHUB_NET1_SSID: 'KIT-HUB_Starlink', KITHUB_NET1_GATEWAY_MACS: ROUTER, DEV_AUTO_APPROVE_DEVICES: 'true' };

async function setup(env: Record<string, string> = ENV) {
  const api = await startTestApi(env);
  syncNetworksFromEnv(api.ctx);
  const cookie = await api.login('daniel');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const device = (await api.call('POST', '/devices/enroll', { cookie, body: { publicKey: pub, label: 'Poste de test' } })).json;
  async function punch(type: 'IN' | 'OUT', over: Partial<Attestation> = {}, who = cookie, tamper = false) {
    const ch = await api.call('POST', '/presence/challenge', { cookie: who, body: { type } });
    if (ch.status !== 200) return ch;
    const a: Attestation = { nonce: ch.json.nonce, deviceKeyId: device.keyId, gatewayMac: ROUTER, bssid: null, ssid: 'KIT-HUB_Starlink', simulated: false, takenAt: '2026-11-25T06:00:00.000Z', ...over };
    const signature = sign(null, Buffer.from(attestationPayload(a)), privateKey).toString('base64');
    if (tamper) a.ssid = 'Kit-Hub3';
    return api.call('POST', '/presence/punch', { cookie: who, body: { attestation: a, signature } });
  }
  return { api, cookie, device, punch };
}

test('entree puis sortie acceptees sur le bon routeur', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  const a = await s.punch('IN');
  assert.equal(a.status, 201); assert.equal(a.json.networkId, 1); assert.equal(a.json.workDate, '2026-11-25');
  assert.equal((await s.punch('IN')).json.error.code, 'WRONG_ORDER');
  assert.equal((await s.punch('OUT')).status, 201);
});
test('bon nom de Wi-Fi mais mauvaise MAC : refuse et journalise', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  const r = await s.punch('IN', { gatewayMac: '02:00:00:00:00:ee' });
  assert.equal(r.status, 403); assert.equal(r.json.error.code, 'GATEWAY_MAC_UNKNOWN');
  assert.equal(s.api.ctx.db.prepare('SELECT count(*) AS n FROM punch_rejections').get()!.n, 1);
});
test('donnee modifiee apres signature : refusee', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  assert.equal((await s.punch('IN', {}, s.cookie, true)).json.error.code, 'BAD_SIGNATURE');
});
test('rejeu du meme defi refuse', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  const ok = await s.punch('IN');
  assert.equal(ok.status, 201);
  const nonce = s.api.ctx.db.prepare('SELECT nonce FROM punch_challenges').get()!.nonce as string;
  assert.equal((await s.punch('OUT', { nonce })).json.error.code, 'CHALLENGE_INVALID');
});
test('defi expire refuse', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  const ch = await s.api.call('POST', '/presence/challenge', { cookie: s.cookie, body: { type: 'IN' } });
  s.api.setClock('2026-11-25T06:02:00.000Z');
  const r = await s.punch('IN', { nonce: ch.json.nonce });
  assert.equal(r.json.error.code, 'CHALLENGE_INVALID');
});
test('pointer depuis le poste personnel de quelqu un d autre : refuse ; depuis une borne : accepte', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  const other = await s.api.login('beoline');
  assert.equal((await s.punch('IN', {}, other)).json.error.code, 'DEVICE_NOT_YOURS');
  const admin = await s.api.login('admin');
  await s.api.call('POST', `/devices/${s.device.id}/approve`, { cookie: admin, body: { kind: 'KIOSK' } });
  assert.equal((await s.punch('IN', {}, other)).status, 201);
});
test('poste en attente refuse', async (t) => {
  const s = await setup({ ...ENV, DEV_AUTO_APPROVE_DEVICES: 'false' }); t.after(() => s.api.close());
  assert.equal((await s.punch('IN')).json.error.code, 'DEVICE_NOT_APPROVED');
});
test('reseau simule : refuse par defaut, accepte seulement si active', async (t) => {
  const sim = { simulated: true, gatewayMac: SIMULATED_GATEWAY_MAC };
  const s = await setup(); t.after(() => s.api.close());
  assert.equal((await s.punch('IN', sim)).json.error.code, 'SIMULATION_FORBIDDEN');
  const d = await setup({ ...ENV, ALLOW_SIMULATED_NETWORK: 'true' }); t.after(() => d.api.close());
  assert.equal((await d.punch('IN', sim)).json.simulated, true);
});
test('aucune MAC configuree : tout est refuse', async (t) => {
  const s = await setup({ DEV_AUTO_APPROVE_DEVICES: 'true' }); t.after(() => s.api.close());
  assert.equal((await s.punch('IN')).json.error.code, 'NETWORK_NOT_CONFIGURED');
});
