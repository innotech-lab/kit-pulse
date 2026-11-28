// V2-L6 (Codex) : notifications personnelles. Creation : core/notify.ts (notify, notifyRoles).
import { Id, NotificationList } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';
import { notFound } from '../../core/errors.ts';
import { createModule, parse } from '../../core/module.ts';

export default function notificationsModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'notifications');
  route('get', '/', ({ user }) => {
    const unread = (ctx.db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(user.id) as { n: number }).n;
    const read = (ctx.db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NOT NULL').get(user.id) as { n: number }).n;
    const rows = ctx.db.prepare(`SELECT * FROM (SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50)
      ORDER BY read_at IS NOT NULL, created_at DESC, id DESC`).all(user.id);
    return NotificationList.parse({ unread, read, items: rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, readAt: r.read_at })) });
  });
  route('delete', '/read', ({ user }) => {
    const result = ctx.db.prepare('DELETE FROM notifications WHERE user_id = ? AND read_at IS NOT NULL').run(user.id);
    return { deleted: Number(result.changes) };
  });
  route('post', '/read-all', ({ user }) => {
    ctx.db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(ctx.now().toISOString(), user.id);
  });
  route('post', '/:id/read', ({ user, params }) => {
    const id = parse(Id, params.id);
    const result = ctx.db.prepare('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?').run(ctx.now().toISOString(), id, user.id);
    if (!result.changes) throw notFound('Notification introuvable.');
  });
  return router;
}
