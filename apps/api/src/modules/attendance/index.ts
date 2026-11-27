// Dancile. Routes d'assiduite (ATT-001, ATT-002, ATT-004). ATT-003 (P1) coupe pour la demo.
import { HolidayInput, Range, RangeForUser } from '@kit-pulse/contracts';
import { audit } from '../../core/audit.ts';
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
  route('get', '/holidays', ({ query }) => {
    const q = query as { from?: string; to?: string };
    const day = /^\d{4}-\d{2}-\d{2}$/;
    const from = day.test(q.from ?? '') ? q.from! : '0000-01-01', to = day.test(q.to ?? '') ? q.to! : '9999-12-31';
    return ctx.db.prepare('SELECT date, label FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date').all(from, to);
  });
  route('post', '/holidays', ({ body, user, res }) => {
    const input = parse(HolidayInput, body);
    ctx.db.prepare('INSERT INTO holidays (date, label) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET label = excluded.label').run(input.date, input.label);
    audit(ctx, user.id, 'HOLIDAY_SET', 'holiday', input.date, { label: input.label });
    res.status(201);
    return input;
  });
  return router;
}
