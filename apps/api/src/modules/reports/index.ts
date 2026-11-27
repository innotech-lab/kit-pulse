// Daniel. Bilans (REP-001, REP-002), calcules via attendance/public.ts.
import { Id, Range, type PersonReport } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';
import { notFound } from '../../core/errors.ts';
import { createModule, parse } from '../../core/module.ts';
import { computeDays } from '../attendance/public.ts';

export function personReport(ctx: Ctx, userId: number, fullName: string, from: string, to: string): PersonReport {
  const days = computeDays(ctx, userId, from, to);
  const count = (f: (d: (typeof days)[number]) => boolean) => days.filter(f).length;
  const tasks = ctx.db.prepare("SELECT status, progress FROM tasks WHERE assignee_id = ? AND work_date BETWEEN ? AND ? AND status != 'CANCELLED'").all(userId, from, to) as { status: string; progress: number }[];
  return {
    userId, fullName,
    expectedDays: count((d) => d.status === 'PRESENT' || d.status === 'LATE' || d.status === 'ABSENT'),
    presentDays: count((d) => d.status === 'PRESENT' || d.status === 'LATE'),
    lateJustified: count((d) => d.status === 'LATE' && d.justified),
    lateUnjustified: count((d) => d.status === 'LATE' && !d.justified),
    absentJustified: count((d) => d.status === 'ABSENT' && d.justified),
    absentUnjustified: count((d) => d.status === 'ABSENT' && !d.justified),
    tasksPlanned: tasks.length,
    tasksDone: tasks.filter((t) => t.status === 'DONE').length,
    averageProgress: tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0,
  };
}

export default function reportsModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'reports');
  route('get', '/me', ({ user, query }) => {
    const r = parse(Range, query);
    return personReport(ctx, user.id, user.fullName, r.from, r.to);
  });
  route('get', '/team', ({ query }) => {
    const r = parse(Range, query);
    const users = ctx.db.prepare('SELECT id, full_name FROM users WHERE is_active = 1 ORDER BY full_name').all() as { id: number; full_name: string }[];
    return users.map((u) => personReport(ctx, u.id, u.full_name, r.from, r.to));
  });
  route('get', '/users/:id', ({ params, query }) => {
    const id = parse(Id, params.id);
    const r = parse(Range, query);
    const u = ctx.db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(id) as { id: number; full_name: string } | undefined;
    if (!u) throw notFound('Personne introuvable.');
    return personReport(ctx, u.id, u.full_name, r.from, r.to);
  });
  return router;
}
