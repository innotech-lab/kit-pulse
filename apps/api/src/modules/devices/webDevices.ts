// V2-L1 : appareils reconnus par le navigateur (cle ECDSA P-256 non extractible, independante du compte).
import { createHash, createPublicKey, verify } from 'node:crypto';
import type { DeviceVerdict, WebDevice, WebDeviceDetail } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';
import { badRequest } from '../../core/errors.ts';

export const webKeyIdOf = (publicKey: string) => createHash('sha256').update(`web:${publicKey}`).digest('hex').slice(0, 32);

/** Verifie que la cle publique est bien une cle ECDSA P-256 au format SPKI. */
export function assertP256(publicKey: string): void {
  try {
    const k = createPublicKey({ key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'spki' });
    if (k.asymmetricKeyType !== 'ec' || k.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new Error('courbe');
  } catch { throw badRequest('INVALID_KEY', 'Clé d’appareil invalide.'); }
}

type Row = Record<string, unknown>;
export const toWebDevice = (r: Row): WebDevice => ({
  id: r.id as number, keyId: r.key_id as string, ownerId: r.owner_id as number, ownerName: r.owner_name as string, label: r.label as string,
  status: r.status as WebDevice['status'], createdAt: r.created_at as string, lastSeenAt: (r.last_seen_at as string | null) ?? null, hasPasskey: !!r.has_passkey,
});
export const DEVICE_SELECT = `SELECT d.*, u.full_name AS owner_name, EXISTS (SELECT 1 FROM device_passkeys p WHERE p.device_id = d.id) AS has_passkey
  FROM web_devices d JOIN users u ON u.id = d.owner_id`;

export function deviceDetail(ctx: Ctx, id: number): WebDeviceDetail | null {
  const row = ctx.db.prepare(`${DEVICE_SELECT} WHERE d.id = ?`).get(id) as Row | undefined;
  if (!row) return null;
  const usedBy = (ctx.db.prepare(`SELECT p.user_id, u.full_name, COUNT(*) AS n, MAX(p.at) AS last_at FROM punches p JOIN users u ON u.id = p.user_id
    WHERE p.web_device_id = ? GROUP BY p.user_id ORDER BY last_at DESC`).all(id) as Row[])
    .map((u) => ({ userId: u.user_id as number, fullName: u.full_name as string, punches: u.n as number, lastAt: u.last_at as string }));
  return { ...toWebDevice(row), usedBy };
}

export interface DeviceCheck { verdict: DeviceVerdict; deviceId: number | null; otherUserId: number | null; label: string | null }

/**
 * Identifie l'appareil qui pointe, independamment du compte connecte :
 * - cle connue et signature valide : OWN (appareil de la personne) ou OTHER (appareil d'un collegue, nomme) ;
 * - sinon, empreinte de secours : LIKE_OTHER si elle ressemble a l'appareil d'un collegue ;
 * - sinon UNKNOWN (jamais vu sur KIT-Pulse).
 * Une signature invalide n'est jamais acceptee comme preuve.
 */
export function checkDevice(ctx: Ctx, userId: number, nonce: string, keyId: string | null, signature: string | null, fingerprint: string | null): DeviceCheck {
  if (keyId && signature) {
    const d = ctx.db.prepare("SELECT * FROM web_devices WHERE key_id = ? AND status != 'REVOKED'").get(keyId) as Row | undefined;
    if (d) {
      let ok = false;
      try {
        const key = createPublicKey({ key: Buffer.from(d.public_key as string, 'base64'), format: 'der', type: 'spki' });
        ok = verify('sha256', Buffer.from(nonce), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64'));
      } catch { ok = false; }
      if (ok) {
        ctx.db.prepare('UPDATE web_devices SET last_seen_at = ? WHERE id = ?').run(ctx.now().toISOString(), d.id as number);
        const own = d.owner_id === userId;
        return { verdict: own ? 'OWN' : 'OTHER', deviceId: d.id as number, otherUserId: own ? null : (d.owner_id as number), label: d.label as string };
      }
    }
  }
  if (fingerprint) {
    const like = ctx.db.prepare("SELECT id, owner_id, label FROM web_devices WHERE fingerprint = ? AND status != 'REVOKED' AND owner_id != ? ORDER BY last_seen_at DESC LIMIT 1")
      .get(fingerprint, userId) as Row | undefined;
    if (like) return { verdict: 'LIKE_OTHER', deviceId: null, otherUserId: like.owner_id as number, label: like.label as string };
  }
  return { verdict: 'UNKNOWN', deviceId: null, otherUserId: null, label: null };
}
