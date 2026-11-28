// Dancile. Routes d'assiduite (ATT-001, ATT-002, ATT-004). ATT-003 (P1) coupe pour la demo.
import { HolidayInput, Range, RangeForUser, UpdateScheduleInput } from '@kit-pulse/contracts';
import { transaction } from '../../../../../db/lib.ts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { badRequest } from '../../core/errors.ts';
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
      : (ctx.db.prepare("SELECT id FROM users WHERE is_active = 1 AND role != 'ADMIN' ORDER BY full_name").all() as { id: number }[]).map((u) => u.id);
    return ids.flatMap((id) => computeDays(ctx, id, r.from, r.to));
  });
  const schedule = () => ctx.db.prepare('SELECT weekday, start_time AS startTime, end_time AS endTime, grace_minutes AS graceMinutes FROM work_schedule ORDER BY weekday').all();
  route('get', '/schedule', schedule);
  route('put', '/schedule', ({ body, user }) => {
    const { days } = parse(UpdateScheduleInput, body);
    const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (new Set(days.map((d) => d.weekday)).size !== days.length || days.some((d) => !validTime(d.startTime) || !validTime(d.endTime) || d.endTime <= d.startTime)) throw badRequest('INVALID_SCHEDULE', 'Horaires ou jours invalides.');
    transaction(ctx.db, () => {
      ctx.db.prepare('DELETE FROM work_schedule').run();
      const insert = ctx.db.prepare('INSERT INTO work_schedule (weekday, start_time, end_time, grace_minutes) VALUES (?,?,?,?)');
      for (const day of days) insert.run(day.weekday, day.startTime, day.endTime, day.graceMinutes);
      audit(ctx, user.id, 'SCHEDULE_SET', 'schedule', null, { days });
    });
    return schedule();
  });
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
  // --- V2-L2 (Claude) : lieu du KiT Hub ---
  route('get', '/site', todo('V2-L2'));
  route('put', '/site', todo('V2-L2'));
  return router;
}
