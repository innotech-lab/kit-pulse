// V2-L6 (Codex) : notifications personnelles. Creation : core/notify.ts (notify, notifyRoles).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function notificationsModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'notifications');
  route('get', '/', todo('V2-L6')); // Mes notifications (non lues d'abord) : NotificationList
  route('post', '/read-all', todo('V2-L6')); // Tout marquer comme lu
  route('post', '/:id/read', todo('V2-L6')); // Marquer une notification comme lue
  return router;
}
