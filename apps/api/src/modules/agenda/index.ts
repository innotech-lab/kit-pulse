import { AgendaEvent, AgendaInput, AgendaUpdateInput, Id, Range, RangeForUser } from '@kit-pulse/contracts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { badRequest, forbidden, notFound } from '../../core/errors.ts';
import { createModule, parse } from '../../core/module.ts';
import { notify } from '../../core/notify.ts';

function event(row: Record<string, unknown>) {
  return AgendaEvent.parse({ id: row.id, userId: row.user_id, title: row.title, kind: row.kind,
    startsAt: row.starts_at, endsAt: row.ends_at, location: row.location, taskId: row.task_id });
}
export default function agendaModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'agenda');
  const get = (id: number) => {
    const row = ctx.db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!row) throw notFound();
    return event(row);
  };
  const validate = (e: { startsAt: string; endsAt: string; taskId: number | null }) => {
    if (e.startsAt >= e.endsAt) throw badRequest('INVALID_INPUT', 'La fin doit suivre le debut.');
    if (e.taskId !== null && !ctx.db.prepare('SELECT id FROM tasks WHERE id = ?').get(e.taskId)) throw badRequest('INVALID_TASK', 'Tache introuvable.');
  };
  const list = (from: string, to: string, userId?: number) => {
    if (from > to) throw badRequest('INVALID_INPUT', 'from doit preceder to.');
    return ctx.db.prepare("SELECT * FROM events WHERE starts_at < date(?, '+1 day') || 'T00:00:00.000Z' AND ends_at > ? || 'T00:00:00.000Z' AND (? IS NULL OR user_id = ?) ORDER BY starts_at, id")
      .all(to, from, userId ?? null, userId ?? null).map(event);
  };
  route('get', '/me', ({ query, user }) => { const { from, to } = parse(Range, query); return list(from, to, user.id); });
  route('get', '/', ({ query }) => { const { from, to, userId } = parse(RangeForUser, query); return list(from, to, userId); });
  route('post', '/', ({ user, body }) => {
    const input = parse(AgendaInput, body), userId = input.userId ?? user.id;
    if (user.role === 'MEMBER' && userId !== user.id) throw forbidden();
    if (!ctx.db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(userId)) throw badRequest('INVALID_USER', 'Utilisateur actif introuvable.');
    validate(input);
    const result = ctx.db.prepare('INSERT INTO events (user_id, title, kind, starts_at, ends_at, location, task_id, created_by) VALUES (?,?,?,?,?,?,?,?)')
      .run(userId, input.title, input.kind, input.startsAt, input.endsAt, input.location, input.taskId, user.id);
    const id = Number(result.lastInsertRowid); audit(ctx, user.id, 'EVENT_CREATE', 'event', id);
    if (userId !== user.id) notify(ctx, [userId], { kind: 'AGENDA_EVENT_ADDED', title: 'Nouvel événement dans votre agenda', body: `${user.fullName} : ${input.title}`, link: '#agenda' });
    return get(id);
  });
  route('patch', '/:id', ({ user, body, params }) => {
    const id = parse(Id, params.id), old = get(id), input = parse(AgendaUpdateInput, body);
    if (user.role === 'MEMBER' && old.userId !== user.id) throw forbidden();
    const next = { ...old, ...input }; validate(next);
    ctx.db.prepare('UPDATE events SET title = ?, kind = ?, starts_at = ?, ends_at = ?, location = ?, task_id = ? WHERE id = ?')
      .run(next.title, next.kind, next.startsAt, next.endsAt, next.location, next.taskId, id);
    audit(ctx, user.id, 'EVENT_UPDATE', 'event', id); return get(id);
  });
  route('delete', '/:id', ({ user, params }) => {
    const id = parse(Id, params.id), old = get(id);
    if (user.role === 'MEMBER' && old.userId !== user.id) throw forbidden();
    ctx.db.prepare('DELETE FROM events WHERE id = ?').run(id);
    audit(ctx, user.id, 'EVENT_DELETE', 'event', id);
  });
  return router;
}
