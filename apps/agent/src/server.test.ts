import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { attestationPayload, SIMULATED_GATEWAY_MAC, type Attestation } from '@kit-pulse/contracts';
import { createAgent } from './server.ts';

async function start() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const upstream = createServer((req, res) => { res.writeHead(200, { 'set-cookie': 'a=b; HttpOnly; Secure; SameSite=Strict' }); res.end(`upstream ${req.url}`); });
  await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', r));
  const agent = createAgent({
    port: 0, upstream: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`, extraOrigins: [],
    keys: { publicKey: pub, keyId: 'k'.repeat(32), sign: (a: Attestation) => sign(null, Buffer.from(attestationPayload(a)), privateKey).toString('base64') },
    read: async () => ({ gatewayMac: SIMULATED_GATEWAY_MAC, bssid: null, ssid: null, simulated: true, interfaceAlias: null, gatewayIp: null }),
  });
  await new Promise<void>((r) => agent.listen(0, '127.0.0.1', r));
  return { pub, base: `http://127.0.0.1:${(agent.address() as AddressInfo).port}`, close: () => { agent.closeAllConnections(); upstream.closeAllConnections(); agent.close(); upstream.close(); } };
}
const NONCE = 'n'.repeat(32);

test('signe une lecture verifiable', async (t) => {
  const s = await start(); t.after(s.close);
  const r = await fetch(`${s.base}/__agent/attest`, { method: 'POST', headers: { 'x-kitpulse': '1' }, body: JSON.stringify({ nonce: NONCE }) });
  const { attestation, signature } = await r.json() as { attestation: Attestation; signature: string };
  const key = createPublicKey({ key: Buffer.from(s.pub, 'base64'), format: 'der', type: 'spki' });
  assert.ok(verify(null, Buffer.from(attestationPayload(attestation)), key, Buffer.from(signature, 'base64')));
});
test('refuse un site tiers et une requete sans en-tete', async (t) => {
  const s = await start(); t.after(s.close);
  const evil = await fetch(`${s.base}/__agent/attest`, { method: 'POST', headers: { origin: 'https://site-tiers.example', 'x-kitpulse': '1' }, body: '{}' });
  assert.equal(evil.status, 403);
  assert.equal((await fetch(`${s.base}/__agent/attest`, { method: 'POST', body: JSON.stringify({ nonce: NONCE }) })).status, 403);
});
test('relaie le reste vers le serveur et adapte le cookie', async (t) => {
  const s = await start(); t.after(s.close);
  const r = await fetch(`${s.base}/api/health`);
  assert.equal(await r.text(), 'upstream /api/health');
  assert.equal(r.headers.get('set-cookie'), 'a=b; HttpOnly; SameSite=Strict');
});
