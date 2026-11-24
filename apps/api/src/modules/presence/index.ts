// Stany. /challenge et /punch sont fournis et testes (coeur du projet) ; le reste est a developper.
import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { attestationPayload, ChallengeInput, checkNetwork, PunchInput, SIMULATED_GATEWAY_MAC, type PunchType } from '@kit-pulse/contracts';
import { transaction } from '../../../../../db/lib.ts';
import type { Ctx } from '../../core/context.ts';
import { conflict, HttpError } from '../../core/errors.ts';
import { createModule, parse, todo } from '../../core/module.ts';
import { knownNetworks } from '../../core/networks.ts';
import { localParts } from '../../core/time.ts';

const CHALLENGE_MS = 60_000;

export default function presenceModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'presence');

  function nextAllowed(userId: number, date: string): PunchType {
    const last = ctx.db.prepare('SELECT type FROM punches WHERE user_id = ? AND work_date = ? ORDER BY at DESC, id DESC LIMIT 1').get(userId, date);
    return last?.type === 'IN' ? 'OUT' : 'IN';
  }
  function assertOrder(userId: number, type: PunchType): string {
    const date = localParts(ctx.now(), ctx.config.timezone).date;
    if (nextAllowed(userId, date) !== type) throw conflict('WRONG_ORDER', type === 'IN' ? 'Entree deja pointee.' : "Pointer l'entree d'abord.");
    return date;
  }

  route('post', '/challenge', ({ body, user }) => {
    const { type } = parse(ChallengeInput, body);
    assertOrder(user.id, type);
    const nonce = randomBytes(24).toString('base64url'), now = ctx.now();
    ctx.db.prepare('DELETE FROM punch_challenges WHERE expires_at < ?').run(now.toISOString());
    const expiresAt = new Date(now.getTime() + CHALLENGE_MS).toISOString();
    ctx.db.prepare('INSERT INTO punch_challenges (nonce, user_id, type, expires_at) VALUES (?,?,?,?)').run(nonce, user.id, type, expiresAt);
    return { nonce, expiresAt };
  });

  route('post', '/punch', ({ body, user, req, res }) => {
    const { attestation: a, signature } = parse(PunchInput, body);
    const now = ctx.now(), at = now.toISOString(), ip = req.ip ?? null;
    const reject = (reason: string, message: string): never => {
      ctx.db.prepare('INSERT INTO punch_rejections (user_id, at, reason, device_key_id, gateway_mac, bssid, ssid, ip) VALUES (?,?,?,?,?,?,?,?)')
        .run(user.id, at, reason, a.deviceKeyId, a.gatewayMac, a.bssid, a.ssid, ip);
      throw new HttpError(403, reason, message);
    };
    // 1. Defi a usage unique, lie a la personne, valable 60 secondes (anti-rejeu).
    const used = ctx.db.prepare('UPDATE punch_challenges SET used_at = ? WHERE nonce = ? AND user_id = ? AND used_at IS NULL AND expires_at > ? RETURNING type').get(at, a.nonce, user.id, at);
    if (!used) return reject('CHALLENGE_INVALID', 'Demande expiree ou deja utilisee. Recommencer.');
    const type = used.type as PunchType;
    // 2. Poste connu, approuve, et appartenant a la personne (sauf borne commune).
    const device = ctx.db.prepare('SELECT * FROM devices WHERE key_id = ?').get(a.deviceKeyId);
    if (!device || device.status !== 'APPROVED') return reject('DEVICE_NOT_APPROVED', "Poste non approuve par l'admin.");
    if (device.kind === 'PERSONAL' && device.user_id !== user.id) return reject('DEVICE_NOT_YOURS', 'Ce poste est enregistre pour une autre personne.');
    // 3. Signature du poste sur la lecture reseau.
    const key = createPublicKey({ key: Buffer.from(device.public_key as string, 'base64'), format: 'der', type: 'spki' });
    if (!verify(null, Buffer.from(attestationPayload(a)), key, Buffer.from(signature, 'base64'))) return reject('BAD_SIGNATURE', 'Signature du poste invalide.');
    // 4. MAC du routeur. Le SSID seul ne suffit jamais.
    let networkId: number | null = null;
    if (a.simulated) {
      if (!ctx.config.allowSimulated || a.gatewayMac !== SIMULATED_GATEWAY_MAC) return reject('SIMULATION_FORBIDDEN', 'Reseau simule refuse.');
    } else {
      const verdict = checkNetwork(a, knownNetworks(ctx), ctx.config.networkMode);
      if (!verdict.ok) return reject(verdict.reason, "Ce poste n'est pas sur un reseau KIT-HUB reconnu.");
      networkId = verdict.networkId;
    }
    // 5. Heure du SERVEUR, jamais celle du poste.
    const punch = transaction(ctx.db, () => {
      const workDate = assertOrder(user.id, type);
      const r = ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, network_id, device_id, gateway_mac, bssid, ssid, ip, simulated, source, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,'AGENT',?)")
        .run(user.id, type, at, workDate, networkId, device.id as number, a.gatewayMac, a.bssid, a.ssid, ip, a.simulated ? 1 : 0, user.id);
      return { id: Number(r.lastInsertRowid), userId: user.id, type, at, workDate, networkId, source: 'AGENT', simulated: a.simulated };
    });
    res.status(201);
    return punch;
  });

  route('get', '/me/today', todo('PRES-002'));
  route('get', '/today', todo('PRES-003'));
  route('get', '/', todo('PRES-003'));
  route('post', '/manual', todo('PRES-004'));
  route('get', '/rejections', todo('PRES-005'));
  return router;
}
