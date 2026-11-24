// Stany. Petit serveur LOCAL : sert KIT-Pulse (relais vers l'API) et signe la lecture reseau.
// Un navigateur ne peut pas lire la MAC d'un routeur : c'est la raison d'etre de ce programme.
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { Attestation } from '@kit-pulse/contracts';
import type { loadKeys } from './keys.ts';
import type { Probe } from './probe.ts';

export interface AgentOptions { port: number; upstream: string; extraOrigins: string[]; keys: ReturnType<typeof loadKeys>; read: () => Promise<Probe> }

export function createAgent(o: AgentOptions): Server {
  const hosts = () => { const a = server.address(); const p = a && typeof a === 'object' ? a.port : o.port; return [`127.0.0.1:${p}`, `localhost:${p}`]; };
  const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const fail = (res: ServerResponse, status: number, code: string, message: string) => json(res, status, { error: { code, message } });

  async function handleAgent(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'GET' && req.url === '/__agent/status') return json(res, 200, { keyId: o.keys.keyId, publicKey: o.keys.publicKey });
    if (req.method === 'POST' && req.url === '/__agent/attest') {
      if (req.headers['x-kitpulse'] !== '1') return fail(res, 403, 'CSRF', 'En-tete X-KitPulse manquant.');
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 2000) return fail(res, 413, 'TOO_LARGE', 'Requete trop grande.'); }
      let nonce: unknown;
      try { nonce = (JSON.parse(raw) as { nonce?: unknown }).nonce; } catch { /* traite ci-dessous */ }
      if (typeof nonce !== 'string' || nonce.length < 20 || nonce.length > 100) return fail(res, 400, 'INVALID_INPUT', 'nonce invalide.');
      const p = await o.read();
      const attestation: Attestation = { nonce, deviceKeyId: o.keys.keyId, gatewayMac: p.gatewayMac, bssid: p.bssid, ssid: p.ssid, simulated: p.simulated, takenAt: new Date().toISOString() };
      return json(res, 200, { attestation, signature: o.keys.sign(attestation) });
    }
    return fail(res, 404, 'NOT_FOUND', 'Route agent inconnue.');
  }
  function proxy(req: IncomingMessage, res: ServerResponse) {
    const target = new URL(o.upstream);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const up = send({ protocol: target.protocol, hostname: target.hostname, port: target.port || undefined, method: req.method, path: req.url, headers: { ...req.headers, host: target.host } }, (r) => {
      const headers = { ...r.headers };
      // Le navigateur parle a l'agent en local : l'attribut Secure y bloquerait le cookie.
      if (headers['set-cookie']) headers['set-cookie'] = headers['set-cookie'].map((c) => c.replace(/;\s*secure/i, ''));
      res.writeHead(r.statusCode ?? 502, headers);
      r.pipe(res);
    });
    up.on('error', () => { if (res.headersSent) res.destroy(); else fail(res, 502, 'SERVER_UNREACHABLE', 'Serveur KIT-Pulse injoignable.'); });
    req.pipe(up);
  }
  const server = createServer((req, res) => {
    // Hote et origine verifies : bloque le DNS rebinding et les sites tiers.
    if (!hosts().includes(req.headers.host ?? '')) return fail(res, 403, 'BAD_HOST', 'Hote refuse.');
    const allowed = [...hosts().map((h) => `http://${h}`), ...o.extraOrigins];
    if (req.headers.origin && !allowed.includes(req.headers.origin)) return fail(res, 403, 'BAD_ORIGIN', 'Origine refusee.');
    if (req.url?.startsWith('/__agent/')) {
      handleAgent(req, res).catch((e: unknown) => { console.error(e); if (!res.headersSent) fail(res, 500, 'PROBE_FAILED', 'Lecture du reseau impossible.'); });
      return;
    }
    proxy(req, res);
  });
  return server;
}
