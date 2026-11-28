// Dancile. Justifications (JUS-001, JUS-002).
import { Id, JustificationInput, ReviewInput, type Justification } from '@kit-pulse/contracts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { conflict, forbidden, HttpError, notFound } from '../../core/errors.ts';
import { createModule, parse } from '../../core/module.ts';
import { notify, notifyRoles } from '../../core/notify.ts';

const toJustification = (r: Record<string, unknown>): Justification => ({
  id: r.id as number, userId: r.user_id as number, workDate: r.work_date as string, kind: r.kind as Justification['kind'],
  reason: r.reason as string, status: r.status as Justification['status'], reviewNote: (r.review_note as string | null) ?? null,
});

export default function justificationsModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'justifications');
  const byId = (id: number) => ctx.db.prepare('SELECT * FROM justifications WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  route('post', '/', ({ user, body }) => {
    const input = parse(JustificationInput, body);
    const dup = ctx.db.prepare('SELECT id FROM justifications WHERE user_id = ? AND work_date = ? AND kind = ?').get(user.id, input.workDate, input.kind);
    if (dup) throw conflict('DUPLICATE', 'Une justification existe deja pour ce jour et ce type.');
    const r = ctx.db.prepare('INSERT INTO justifications (user_id, work_date, kind, reason, created_at) VALUES (?,?,?,?,?)')
      .run(user.id, input.workDate, input.kind, input.reason, ctx.now().toISOString());
    const id = Number(r.lastInsertRowid);
    audit(ctx, user.id, 'JUSTIFICATION_CREATE', 'justification', id);
    notifyRoles(ctx, ['ADMIN', 'HR'], { kind: 'JUSTIFICATION_SUBMITTED', title: 'Nouvelle justification', body: `${user.fullName} · ${input.workDate}`, link: '#reviews' }, user.id);
    return toJustification(byId(id)!);
  });
  route('get', '/me', ({ user }) =>
    (ctx.db.prepare('SELECT * FROM justifications WHERE user_id = ? ORDER BY work_date DESC, id DESC').all(user.id) as Record<string, unknown>[]).map(toJustification));
  route('get', '/', () =>
    (ctx.db.prepare("SELECT * FROM justifications ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END, work_date DESC, id DESC").all() as Record<string, unknown>[]).map(toJustification));
  route('post', '/:id/review', ({ user, params, body }) => {
    const id = parse(Id, params.id);
    const input = parse(ReviewInput, body);
    const row = byId(id);
    if (!row) throw notFound('Justification introuvable.');
    if (row.user_id === user.id) throw forbidden('On ne traite jamais sa propre justification.');
    if (row.status !== 'PENDING') throw new HttpError(409, 'ALREADY_REVIEWED', 'Justification deja traitee.');
    ctx.db.prepare('UPDATE justifications SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
      .run(input.status, input.note, user.id, ctx.now().toISOString(), id);
    audit(ctx, user.id, `JUSTIFICATION_${input.status}`, 'justification', id, { note: input.note });
    notify(ctx, [row.user_id as number], { kind: 'JUSTIFICATION_DECIDED', title: input.status === 'ACCEPTED' ? 'Justification acceptée' : 'Justification refusée', body: `${row.work_date}${input.note ? ` · ${input.note}` : ''}`, link: '#attendance' });
    return toJustification(byId(id)!);
  });
  return router;
}
