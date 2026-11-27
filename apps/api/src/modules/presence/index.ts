// Stany. /challenge et /punch sont fournis et testes (coeur du projet) ; le reste est a developper.
import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { attestationPayload, ChallengeInput, checkNetwork, ManualPunchInput, PunchInput, RangeForUser, SIMULATED_GATEWAY_MAC, type Punch, type PunchType } from '@kit-pulse/contracts';
import { audit } from '../../core/audit.ts';
import { transaction } from '../../../../../db/lib.ts';
import type { Ctx } from '../../core/context.ts';
import { conflict, HttpError } from '../../core/errors.ts';
import { createModule, parse, todo } from '../../core/module.ts';
import { knownNetworks } from '../../core/networks.ts';
import { localParts } from '../../core/time.ts';

const CHALLENGE_MS = 60_000;
const toPunch = (r: Record<string, unknown>): Punch => ({
  id: r.id as number, userId: r.user_id as number, type: r.type as PunchType, at: r.at as string, workDate: r.work_date as string,
  networkId: (r.network_id as number | null) ?? null, source: r.source as Punch['source'], simulated: r.simulated === 1,
});

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

  route('get', '/me/today', ({ user }) => {
    const date = localParts(ctx.now(), ctx.config.timezone).date;
    const punches = (ctx.db.prepare('SELECT * FROM punches WHERE user_id = ? AND work_date = ? ORDER BY at, id').all(user.id, date) as Record<string, unknown>[]).map(toPunch);
    return { workDate: date, punches, next: nextAllowed(user.id, date) };
  });
  route('get', '/today', () => {
    const date = localParts(ctx.now(), ctx.config.timezone).date;
    const rows = ctx.db.prepare(`SELECT u.id, u.full_name,
        (SELECT MIN(at) FROM punches p WHERE p.user_id = u.id AND p.work_date = ? AND p.type = 'IN') AS first_in,
        (SELECT type FROM punches p WHERE p.user_id = u.id AND p.work_date = ? ORDER BY at DESC, id DESC LIMIT 1) AS last_type,
        (SELECT at FROM punches p WHERE p.user_id = u.id AND p.work_date = ? ORDER BY at DESC, id DESC LIMIT 1) AS last_at
      FROM users u WHERE u.is_active = 1 AND u.role != 'ADMIN' ORDER BY u.full_name`).all(date, date, date) as Record<string, unknown>[];
    return rows.map((r) => ({ userId: r.id as number, fullName: r.full_name as string, present: r.last_type === 'IN', firstIn: (r.first_in as string | null) ?? null, lastPunchAt: (r.last_at as string | null) ?? null }));
  });
  route('get', '/', ({ query }) => {
    const r = parse(RangeForUser, query);
    const rows = r.userId !== undefined
      ? ctx.db.prepare('SELECT * FROM punches WHERE user_id = ? AND work_date BETWEEN ? AND ? ORDER BY at DESC, id DESC LIMIT 2000').all(r.userId, r.from, r.to)
      : ctx.db.prepare('SELECT * FROM punches WHERE work_date BETWEEN ? AND ? ORDER BY at DESC, id DESC LIMIT 2000').all(r.from, r.to);
    return (rows as Record<string, unknown>[]).map(toPunch);
  });
  route('post', '/manual', ({ body, user, res }) => {
    const input = parse(ManualPunchInput, body);
    if (!ctx.db.prepare('SELECT id FROM users WHERE id = ?').get(input.userId)) throw new HttpError(404, 'NOT_FOUND', 'Personne introuvable.');
    if (new Date(input.at) > ctx.now()) throw new HttpError(400, 'FUTURE_PUNCH', 'Un pointage manuel ne peut pas etre dans le futur.');
    const workDate = localParts(new Date(input.at), ctx.config.timezone).date;
    const r = ctx.db.prepare("INSERT INTO punches (user_id, type, at, work_date, simulated, source, reason, created_by) VALUES (?,?,?,?,0,'MANUAL',?,?)")
      .run(input.userId, input.type, input.at, workDate, input.reason, user.id);
    const id = Number(r.lastInsertRowid);
    audit(ctx, user.id, 'PUNCH_MANUAL', 'punch', id, { userId: input.userId, type: input.type, at: input.at, reason: input.reason });
    res.status(201);
    return toPunch(ctx.db.prepare('SELECT * FROM punches WHERE id = ?').get(id) as Record<string, unknown>);
  });
  route('get', '/rejections', todo('PRES-005'));
  return router;
}
