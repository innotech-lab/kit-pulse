// V2-L6 : creer des notifications depuis n'importe quel module. Lecture et UI : modules/notifications (lot 6).
import type { NotificationKind } from '@kit-pulse/contracts';
import type { Ctx } from './context.ts';

export interface NotifyInput { kind: NotificationKind; title: string; body?: string | null; link?: string | null }

/** Notifie des comptes precis (les inactifs sont ignores). */
export function notify(ctx: Ctx, userIds: number[], n: NotifyInput): void {
  const ids = [...new Set(userIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) return;
  const active = new Set((ctx.db.prepare(`SELECT id FROM users WHERE is_active = 1 AND id IN (${ids.map(() => '?').join(',')})`).all(...ids) as { id: number }[]).map((r) => r.id));
  const insert = ctx.db.prepare('INSERT INTO notifications (user_id, kind, title, body, link, created_at) VALUES (?,?,?,?,?,?)');
  const at = ctx.now().toISOString();
  for (const id of ids) if (active.has(id)) insert.run(id, n.kind, n.title, n.body ?? null, n.link ?? null, at);
}

/** Notifie tous les comptes actifs d'un ou plusieurs roles (ex. la RH), sauf eventuellement l'auteur de l'action. */
export function notifyRoles(ctx: Ctx, roles: string[], n: NotifyInput, exceptUserId?: number): void {
  const ids = (ctx.db.prepare(`SELECT id FROM users WHERE is_active = 1 AND role IN (${roles.map(() => '?').join(',')})`).all(...roles) as { id: number }[])
    .map((r) => r.id).filter((id) => id !== exceptUserId);
  notify(ctx, ids, n);
}
