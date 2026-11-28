// Stany. /enroll et /approve sont fournis (necessaires au pointage) ; le reste est a developper.
import { createHash, createPublicKey } from 'node:crypto';
import { ApproveDeviceInput, EnrollInput, Id, WebDeviceRegisterInput } from '@kit-pulse/contracts';
import { notifyRoles } from '../../core/notify.ts';
import { assertP256, DEVICE_SELECT, deviceDetail, toWebDevice, webKeyIdOf } from './webDevices.ts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { badRequest, conflict, notFound } from '../../core/errors.ts';
import { createModule, parse, todo } from '../../core/module.ts';

export const keyIdOf = (publicKey: string) => createHash('sha256').update(publicKey).digest('hex').slice(0, 32);

export default function devicesModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'devices');
  route('post', '/enroll', ({ body, user }) => {
    const { publicKey, label } = parse(EnrollInput, body);
    try {
      const k = createPublicKey({ key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'spki' });
      if (k.asymmetricKeyType !== 'ed25519') throw new Error('type');
    } catch { throw badRequest('INVALID_KEY', 'Cle publique invalide.'); }
    const keyId = keyIdOf(publicKey);
    const found = ctx.db.prepare('SELECT id, user_id, status, kind FROM devices WHERE key_id = ?').get(keyId);
    if (found) {
      if (found.user_id !== user.id && found.kind !== 'KIOSK') throw conflict('DEVICE_OWNED', 'Ce poste appartient deja a une autre personne.');
      return { id: found.id, keyId, status: found.status };
    }
    const status = ctx.config.autoApproveDevices ? 'APPROVED' : 'PENDING';
    const r = ctx.db.prepare('INSERT INTO devices (key_id, public_key, label, user_id, status, created_at) VALUES (?,?,?,?,?,?)').run(keyId, publicKey, label, user.id, status, ctx.now().toISOString());
    audit(ctx, user.id, 'DEVICE_ENROLL', 'device', Number(r.lastInsertRowid), { status });
    return { id: Number(r.lastInsertRowid), keyId, status };
  });
  route('get', '/', () => (ctx.db.prepare(`SELECT d.id, d.key_id, d.label, d.kind, d.user_id, u.full_name, d.status, d.created_at, d.reviewed_at
    FROM devices d JOIN users u ON u.id = d.user_id ORDER BY CASE d.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, d.created_at DESC`).all() as Record<string, unknown>[])
    .map((d) => ({ id: d.id, keyId: d.key_id, label: d.label, kind: d.kind, userId: d.user_id, fullName: d.full_name, status: d.status, createdAt: d.created_at, reviewedAt: d.reviewed_at ?? null })));
  route('post', '/:id/approve', ({ params, body, user }) => {
    const id = parse(Id, params.id), { kind } = parse(ApproveDeviceInput, body);
    const r = ctx.db.prepare("UPDATE devices SET status = 'APPROVED', kind = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(kind, user.id, ctx.now().toISOString(), id);
    if (!r.changes) throw notFound();
    audit(ctx, user.id, 'DEVICE_APPROVE', 'device', id, { kind });
    return { id, status: 'APPROVED', kind };
  });
  route('post', '/:id/revoke', ({ params, user }) => {
    const id = parse(Id, params.id);
    const r = ctx.db.prepare("UPDATE devices SET status = 'REVOKED', reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(user.id, ctx.now().toISOString(), id);
    if (!r.changes) throw notFound();
    audit(ctx, user.id, 'DEVICE_REVOKE', 'device', id);
    return { id, status: 'REVOKED' };
  });
  // --- V2-L1 (Claude) : appareils reconnus par le navigateur ---
  // Enregistre l'appareil du navigateur au nom du compte connecte. Deja connu : on ne change JAMAIS son proprietaire.
  route('post', '/web/register', ({ body, user }) => {
    const input = parse(WebDeviceRegisterInput, body);
    assertP256(input.publicKey);
    const keyId = webKeyIdOf(input.publicKey);
    const found = ctx.db.prepare('SELECT id, owner_id, status FROM web_devices WHERE key_id = ?').get(keyId) as { id: number; owner_id: number; status: string } | undefined;
    if (found) {
      if (input.fingerprint) ctx.db.prepare('UPDATE web_devices SET fingerprint = ? WHERE id = ? AND owner_id = ?').run(input.fingerprint, found.id, user.id);
      return { id: found.id, keyId, status: found.status, mine: found.owner_id === user.id };
    }
    const status = ctx.config.autoApproveDevices ? 'APPROVED' : 'PENDING';
    const r = ctx.db.prepare('INSERT INTO web_devices (key_id, public_key, owner_id, label, fingerprint, status, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(keyId, input.publicKey, user.id, input.label, input.fingerprint, status, ctx.now().toISOString());
    const id = Number(r.lastInsertRowid);
    audit(ctx, user.id, 'WEB_DEVICE_REGISTER', 'web_device', id, { label: input.label, status });
    if (status === 'PENDING') notifyRoles(ctx, ['ADMIN'], { kind: 'DEVICE_TO_APPROVE', title: `Nouvel appareil à approuver : ${input.label}`, body: `Enregistré par ${user.fullName}`, link: '#admin' }, user.id);
    return { id, keyId, status, mine: true };
  });
  route('get', '/web', () => (ctx.db.prepare(`${DEVICE_SELECT} ORDER BY CASE d.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, d.created_at DESC`).all() as Record<string, unknown>[]).map(toWebDevice));
  route('get', '/web/:id', ({ params }) => {
    const d = deviceDetail(ctx, parse(Id, params.id));
    if (!d) throw notFound('Appareil introuvable.');
    return d;
  });
  route('post', '/web/:id/approve', ({ params, user }) => {
    const id = parse(Id, params.id);
    const r = ctx.db.prepare("UPDATE web_devices SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(user.id, ctx.now().toISOString(), id);
    if (!r.changes) throw notFound('Appareil introuvable.');
    audit(ctx, user.id, 'WEB_DEVICE_APPROVE', 'web_device', id);
    return deviceDetail(ctx, id);
  });
  route('post', '/web/:id/revoke', ({ params, user }) => {
    const id = parse(Id, params.id);
    const r = ctx.db.prepare("UPDATE web_devices SET status = 'REVOKED', reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(user.id, ctx.now().toISOString(), id);
    if (!r.changes) throw notFound('Appareil introuvable.');
    audit(ctx, user.id, 'WEB_DEVICE_REVOKE', 'web_device', id);
    return deviceDetail(ctx, id);
  });
  route('post', '/web/:id/passkey/options', todo('V2-L1'));
  route('post', '/web/:id/passkey', todo('V2-L1'));
  return router;
}
