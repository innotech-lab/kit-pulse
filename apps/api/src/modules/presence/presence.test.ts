import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { attestationPayload, SIMULATED_GATEWAY_MAC, type Attestation } from '@kit-pulse/contracts';
import { syncNetworksFromEnv } from '../../core/networks.ts';
import { startTestApi } from '../../testing.ts';

// MAC de test localement administrees, sans rapport avec les routeurs KIT-HUB.
const ROUTER = '02:00:00:00:00:0a';
// Photos d'arrivee ecrites dans un dossier temporaire ; plus petit JPEG valide (FF D8 FF D9).
const PHOTOS_DIR = mkdtempSync(join(tmpdir(), 'kp-photos-'));
const PHOTO = 'data:image/jpeg;base64,/9j/2Q==';
const ENV = { KITHUB_NET1_SSID: 'KIT-HUB_Starlink', KITHUB_NET1_GATEWAY_MACS: ROUTER, DEV_AUTO_APPROVE_DEVICES: 'true', PHOTOS_DIR };

async function setup(env: Record<string, string> = ENV) {
  const api = await startTestApi(env);
  syncNetworksFromEnv(api.ctx);
  const cookie = await api.login('daniel');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const device = (await api.call('POST', '/devices/enroll', { cookie, body: { publicKey: pub, label: 'Poste de test' } })).json;
  async function punch(type: 'IN' | 'OUT', over: Partial<Attestation> = {}, who = cookie, tamper = false, withPhoto = true) {
    const ch = await api.call('POST', '/presence/challenge', { cookie: who, body: { type } });
    if (ch.status !== 200) return ch;
    const a: Attestation = { nonce: ch.json.nonce, deviceKeyId: device.keyId, gatewayMac: ROUTER, bssid: null, ssid: 'KIT-HUB_Starlink', simulated: false, takenAt: '2026-11-25T06:00:00.000Z', ...over };
    const signature = sign(null, Buffer.from(attestationPayload(a)), privateKey).toString('base64');
    if (tamper) a.ssid = 'Kit-Hub3';
    return api.call('POST', '/presence/punch', { cookie: who, body: { attestation: a, signature, photo: type === 'IN' && withPhoto ? PHOTO : null } });
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

test('PRES-006 : arrivee sans photo refusee ; avec photo en attente, comptee, validee par les RH', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  assert.equal((await s.punch('IN', {}, s.cookie, false, false)).json.error.code, 'PHOTO_REQUIRED');
  const a = await s.punch('IN');
  assert.equal(a.status, 201); assert.equal(a.json.reviewStatus, 'PENDING');
  // La journee compte deja, avec l'etiquette a valider.
  const day = (await s.api.call('GET', '/attendance/me?from=2026-11-25&to=2026-11-25', { cookie: s.cookie })).json[0];
  assert.deepEqual([day.status, day.arrivalPending], ['PRESENT', true]);
  // La sortie reste simple (sans photo, validee d'office).
  assert.equal((await s.punch('OUT')).json.reviewStatus, 'APPROVED');
  const rh = await s.api.login('rh');
  assert.equal((await s.api.call('GET', '/presence/reviews', { cookie: s.cookie })).status, 403);
  const list = (await s.api.call('GET', '/presence/reviews', { cookie: rh })).json;
  assert.deepEqual([list[0].punchId, list[0].hasPhoto, list[0].reviewStatus], [a.json.id, true, 'PENDING']);
  const photo = await fetch(`${s.api.base}/presence/reviews/${a.json.id}/photo`, { headers: { cookie: rh, 'x-kitpulse': '1' } });
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  assert.equal((await s.api.call('POST', `/presence/reviews/${a.json.id}`, { cookie: rh, body: { status: 'APPROVED' } })).json.reviewStatus, 'APPROVED');
  assert.equal((await s.api.call('POST', `/presence/reviews/${a.json.id}`, { cookie: rh, body: { status: 'REJECTED', note: 'x' } })).status, 409);
  const after = (await s.api.call('GET', '/attendance/me?from=2026-11-25&to=2026-11-25', { cookie: s.cookie })).json[0];
  assert.equal(after.arrivalPending, false);
});

test('PRES-006 : refus = arrivee annulee, motif obligatoire, jamais sa propre arrivee, photo supprimee apres 7 jours', async (t) => {
  const s = await setup(); t.after(() => s.api.close());
  const a = await s.punch('IN');
  const rh = await s.api.login('rh');
  assert.equal((await s.api.call('POST', `/presence/reviews/${a.json.id}`, { cookie: rh, body: { status: 'REJECTED' } })).status, 400);
  const no = await s.api.call('POST', `/presence/reviews/${a.json.id}`, { cookie: rh, body: { status: 'REJECTED', note: 'Ce n est pas Daniel sur la photo' } });
  assert.deepEqual([no.json.reviewStatus, no.json.reviewNote], ['REJECTED', 'Ce n est pas Daniel sur la photo']);
  // Annulee partout : la journee n'a plus d'arrivee, et la personne peut repointer.
  const day = (await s.api.call('GET', '/attendance/me?from=2026-11-25&to=2026-11-25', { cookie: s.cookie })).json[0];
  assert.equal(day.firstIn, null);
  assert.equal((await s.api.call('GET', '/presence/me/today', { cookie: s.cookie })).json.next, 'IN');
  assert.equal((await s.punch('IN')).status, 201);
  // La RH ne valide pas sa propre arrivee (droit verifie meme pour elle).
  const own = s.api.ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, simulated, source, created_by, review_status) VALUES (2,'IN','2026-11-25T06:00:00.000Z','2026-11-25',0,'AGENT',2,'PENDING')").run();
  assert.equal((await s.api.call('POST', `/presence/reviews/${Number(own.lastInsertRowid)}`, { cookie: rh, body: { status: 'APPROVED' } })).status, 403);
  // Retention : 8 jours plus tard, la photo est supprimee au prochain passage.
  s.api.setClock('2026-12-03T06:00:00.000Z');
  const { default: presenceModule } = await import('./index.ts');
  presenceModule(s.api.ctx);
  const row = s.api.ctx.db.prepare('SELECT photo_file FROM punches WHERE id = ?').get(a.json.id) as { photo_file: string | null };
  assert.equal(row.photo_file, null);
});
