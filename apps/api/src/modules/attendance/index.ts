// Dancile. Routes d'assiduite (ATT-001, ATT-002). ATT-003/004 (P1/P2) coupes pour la demo.
import { Range, RangeForUser } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';
import { createModule, parse, todo } from '../../core/module.ts';
import { computeDays } from './public.ts';

export default function attendanceModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'attendance');
  route('get', '/me', ({ user, query }) => {
    const r = parse(Range, query);
    return computeDays(ctx, user.id, r.from, r.to);
  });
  route('get', '/', ({ query }) => {
    const r = parse(Range, query);
    const { userId } = parse(RangeForUser, query);
    const ids = userId !== undefined ? [userId]
      : (ctx.db.prepare('SELECT id FROM users WHERE is_active = 1 ORDER BY full_name').all() as { id: number }[]).map((u) => u.id);
    return ids.flatMap((id) => computeDays(ctx, id, r.from, r.to));
  });
  route('get', '/schedule', todo('ATT-003')); // Horaire de travail
  route('put', '/schedule', todo('ATT-003')); // Modifier les horaires
  route('get', '/holidays', todo('ATT-004')); // Jours feries
  route('post', '/holidays', todo('ATT-004')); // Ajouter un jour ferie
  return router;
}
