import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startTestApi } from '../../testing.ts';

const PHOTO = 'data:image/jpeg;base64,/9j/2Q==';
const KITHUB = { lat: -3.3822, lng: 29.3644 }; // coordonnees de test
function browserKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return { pub: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'), sign: (m: string) => sign('sha256', Buffer.from(m), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64') };
}

async function setup() {
  const api = await startTestApi({ PHOTOS_DIR: mkdtempSync(join(tmpdir(), 'kp-web-')), DEV_AUTO_APPROVE_DEVICES: 'true' });
  const admin = await api.login('admin');
  await api.call('PUT', '/attendance/site', { cookie: admin, body: { ...KITHUB, radiusM: 100 } });
  /** Pointe comme le navigateur : defi, enregistrement de l'appareil, signature, lieu, photo. */
  async function punch(cookie: string, type: 'IN' | 'OUT', key: ReturnType<typeof browserKey> | null, geo: { lat: number; lng: number; accuracy: number } | null, extra: Record<string, unknown> = {}) {
    const { nonce } = (await api.call('POST', '/presence/challenge', { cookie, body: { type } })).json;
    let deviceKeyId = null, deviceSignature = null;
    if (key) {
      deviceKeyId = (await api.call('POST', '/devices/web/register', { cookie, body: { publicKey: key.pub, label: 'Appareil de test', fingerprint: null } })).json.keyId;
      deviceSignature = key.sign(nonce);
    }
    return api.call('POST', '/presence/web-punch', { cookie, body: { type, nonce, deviceKeyId, deviceSignature, fingerprint: null, privateMode: false, geo, geoError: geo ? null : 'DENIED', photo: type === 'IN' ? PHOTO : null, livenessFrames: [], ...extra } });
  }
  return { api, admin, punch };
}

test('V2-L2 : arrivee web en attente avec ses indices (appareil, lieu, visage), sortie simple', async (t) => {
  const { api, punch } = await setup(); t.after(() => api.close());
  const daniel = await api.login('daniel'), rh = await api.login('rh');
  const key = browserKey();
  // Arrivee sans photo : refusee.
  const { nonce } = (await api.call('POST', '/presence/challenge', { cookie: daniel, body: { type: 'IN' } })).json;
  assert.equal((await api.call('POST', '/presence/web-punch', { cookie: daniel, body: { type: 'IN', nonce, deviceKeyId: null, deviceSignature: null, geo: null } })).json.error.code, 'PHOTO_REQUIRED');
  // Arrivee depuis son appareil, dans le KiT Hub (a 40 m, precision 30 m).
  const a = await punch(daniel, 'IN', key, { lat: KITHUB.lat + 0.00036, lng: KITHUB.lng, accuracy: 30 });
  assert.deepEqual([a.status, a.json.reviewStatus], [201, 'PENDING']);
  const sig = (await api.call('GET', `/presence/reviews/${a.json.id}/signals`, { cookie: rh })).json;
  assert.equal(sig.device.verdict, 'OWN');
  assert.equal(sig.geo.verdict, 'INSIDE');
  assert.ok(sig.geo.distanceM >= 35 && sig.geo.distanceM <= 45);
  assert.equal(sig.face.verdict, 'NO_TEMPLATE');
  assert.equal(sig.highConfidence, false);
  // La RH est notifiee de l'arrivee a valider.
  assert.ok((await api.call('GET', '/notifications', { cookie: rh })).json.items.some((n: { kind: string }) => n.kind === 'ARRIVAL_TO_REVIEW'));
  // Sortie : sans photo, validee d'office.
  const o = await punch(daniel, 'OUT', key, { ...KITHUB, accuracy: 20 });
  assert.deepEqual([o.status, o.json.reviewStatus], [201, 'APPROVED']);
});

test('V2-L2 : hors zone et position refusee signales ; appareil d un collegue nomme et notifie', async (t) => {
  const { api, punch } = await setup(); t.after(() => api.close());
  const daniel = await api.login('daniel'), stany = await api.login('stany'), rh = await api.login('rh');
  const danielPhone = browserKey();
  await api.call('POST', '/devices/web/register', { cookie: daniel, body: { publicKey: danielPhone.pub, label: 'Téléphone de Daniel', fingerprint: null } });
  // Stany pointe avec le telephone de Daniel, a 2 km du KiT Hub.
  const a = await punch(stany, 'IN', danielPhone, { lat: KITHUB.lat + 0.018, lng: KITHUB.lng, accuracy: 15 });
  const sig = (await api.call('GET', `/presence/reviews/${a.json.id}/signals`, { cookie: rh })).json;
  assert.deepEqual([sig.device.verdict, sig.device.otherUserName, sig.geo.verdict], ['OTHER', 'Daniel', 'OUTSIDE']);
  const rhNotes = (await api.call('GET', '/notifications', { cookie: rh })).json.items as { kind: string; title: string }[];
  assert.ok(rhNotes.some((n) => n.kind === 'DEVICE_USED_BY_OTHER' && n.title.includes('Stany') && n.title.includes('Daniel')));
  const danielNotes = (await api.call('GET', '/notifications', { cookie: daniel })).json.items as { kind: string }[];
  assert.ok(danielNotes.some((n) => n.kind === 'DEVICE_USED_BY_OTHER'));
  // Position refusee par le navigateur : signalee, pas bloquee.
  const rhUser = await api.login('coordination');
  const b = await punch(rhUser, 'IN', null, null);
  assert.equal(b.status, 201);
  const sigB = (await api.call('GET', `/presence/reviews/${b.json.id}/signals`, { cookie: rh })).json;
  assert.deepEqual([sigB.device.verdict, sigB.geo.verdict], ['UNKNOWN', 'DENIED']);
});
