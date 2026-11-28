import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { startTestApi } from '../../testing.ts';
import { checkDevice } from './webDevices.ts';

/** Simule le navigateur : cle ECDSA P-256, signature au format IEEE P1363 (comme WebCrypto). */
function browserKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    pub: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
    sign: (msg: string) => sign('sha256', Buffer.from(msg), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64'),
  };
}
const NONCE = 'defi-de-test-0123456789abcdef';

test('V2-L1 : enregistrement, proprietaire jamais change, approbation reservee a l admin', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const daniel = await api.login('daniel'), stany = await api.login('stany'), admin = await api.login('admin');
  const k = browserKey();
  const reg = await api.call('POST', '/devices/web/register', { cookie: daniel, body: { publicKey: k.pub, label: 'PC de Daniel', fingerprint: 'abcdef0123456789' } });
  assert.deepEqual([reg.status, reg.json.status, reg.json.mine], [200, 'PENDING', true]);
  // Stany tente d'enregistrer le meme appareil : il reste a Daniel.
  const again = await api.call('POST', '/devices/web/register', { cookie: stany, body: { publicKey: k.pub, label: 'Mon PC', fingerprint: null } });
  assert.deepEqual([again.json.id, again.json.mine], [reg.json.id, false]);
  assert.equal((await api.call('POST', `/devices/web/${reg.json.id}/approve`, { cookie: daniel })).status, 403);
  assert.equal((await api.call('POST', `/devices/web/${reg.json.id}/approve`, { cookie: admin })).json.status, 'APPROVED');
  const list = (await api.call('GET', '/devices/web', { cookie: admin })).json;
  assert.equal(list[0].ownerName, 'Daniel');
  assert.equal((await api.call('POST', '/devices/web/register', { cookie: daniel, body: { publicKey: 'pas-une-cle-valide-du-tout-0123456789abcdef', label: 'x', fingerprint: null } })).status, 400);
});

test('V2-L1 : verdicts OWN, OTHER (collegue nomme), LIKE_OTHER, UNKNOWN ; signature fausse ou appareil revoque refuses', async (t) => {
  const api = await startTestApi(); t.after(() => api.close());
  const daniel = await api.login('daniel'), admin = await api.login('admin');
  const k = browserKey(), intrus = browserKey();
  const dev = (await api.call('POST', '/devices/web/register', { cookie: daniel, body: { publicKey: k.pub, label: 'Téléphone de Daniel', fingerprint: 'feedface00112233' } })).json;
  const keyId = dev.keyId;
  // Daniel (4) sur son appareil.
  assert.deepEqual(checkDevice(api.ctx, 4, NONCE, keyId, k.sign(NONCE), null), { verdict: 'OWN', deviceId: dev.id, otherUserId: null, label: 'Téléphone de Daniel' });
  // Stany (6) sur le telephone de Daniel, quel que soit le compte connecte.
  assert.deepEqual(checkDevice(api.ctx, 6, NONCE, keyId, k.sign(NONCE), null), { verdict: 'OTHER', deviceId: dev.id, otherUserId: 4, label: 'Téléphone de Daniel' });
  // Signature d'une autre cle : jamais une preuve.
  assert.equal(checkDevice(api.ctx, 4, NONCE, keyId, intrus.sign(NONCE), null).verdict, 'UNKNOWN');
  // Autre navigateur ou navigation privee sur le telephone de Daniel : l'empreinte ressemble.
  assert.deepEqual(checkDevice(api.ctx, 6, NONCE, null, null, 'feedface00112233'), { verdict: 'LIKE_OTHER', deviceId: null, otherUserId: 4, label: 'Téléphone de Daniel' });
  assert.equal(checkDevice(api.ctx, 6, NONCE, null, null, '0000000000000000').verdict, 'UNKNOWN');
  // Appareil revoque : plus reconnu.
  await api.call('POST', `/devices/web/${dev.id}/revoke`, { cookie: admin });
  assert.equal(checkDevice(api.ctx, 4, NONCE, keyId, k.sign(NONCE), null).verdict, 'UNKNOWN');
  const fiche = (await api.call('GET', `/devices/web/${dev.id}`, { cookie: admin })).json;
  assert.deepEqual([fiche.status, fiche.usedBy], ['REVOKED', []]);
});
