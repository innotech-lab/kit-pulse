// Stany. /enroll et /approve sont fournis (necessaires au pointage) ; le reste est a developper.
import { createHash, createPublicKey } from 'node:crypto';
import { ApproveDeviceInput, EnrollInput, Id } from '@kit-pulse/contracts';
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
  route('get', '/', todo('DEV-002'));
  route('post', '/:id/approve', ({ params, body, user }) => {
    const id = parse(Id, params.id), { kind } = parse(ApproveDeviceInput, body);
    const r = ctx.db.prepare("UPDATE devices SET status = 'APPROVED', kind = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(kind, user.id, ctx.now().toISOString(), id);
    if (!r.changes) throw notFound();
    audit(ctx, user.id, 'DEVICE_APPROVE', 'device', id, { kind });
    return { id, status: 'APPROVED', kind };
  });
  route('post', '/:id/revoke', todo('DEV-002'));
  return router;
}
