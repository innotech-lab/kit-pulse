import { CreateTaskInput, Id, ProgressInput, Range, RangeForUser, Task, UpdateTaskInput } from '@kit-pulse/contracts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { badRequest, forbidden, notFound } from '../../core/errors.ts';
import { createModule, parse } from '../../core/module.ts';

function task(row: Record<string, unknown>) {
  return Task.parse({ id: row.id, title: row.title, description: row.description, assigneeId: row.assignee_id,
    createdBy: row.created_by, priority: row.priority, status: row.status, progress: row.progress,
    workDate: row.work_date, dueDate: row.due_date });
}

export default function tasksModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'tasks');
  const get = (id: number) => {
    const row = ctx.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) throw notFound();
    return task(row);
  };
  const active = (id: number) => {
    if (!ctx.db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(id))
      throw badRequest('INVALID_ASSIGNEE', 'Utilisateur actif introuvable.');
  };
  route('get', '/me', ({ user, query }) => {
    const { from, to } = parse(Range, query);
    return ctx.db.prepare('SELECT * FROM tasks WHERE assignee_id = ? AND work_date BETWEEN ? AND ? ORDER BY work_date, id').all(user.id, from, to).map(task);
  });
  route('get', '/', ({ query }) => {
    const { from, to, userId } = parse(RangeForUser, query);
    if (from > to) throw badRequest('INVALID_INPUT', 'from doit preceder to.');
    return ctx.db.prepare('SELECT * FROM tasks WHERE work_date BETWEEN ? AND ? AND (? IS NULL OR assignee_id = ?) ORDER BY work_date, id').all(from, to, userId ?? null, userId ?? null).map(task);
  });
  route('post', '/', ({ user, body }) => {
    const input = parse(CreateTaskInput, body);
    if (user.role === 'MEMBER' && input.assigneeId !== user.id) throw forbidden();
    active(input.assigneeId);
    const now = ctx.now().toISOString();
    const result = ctx.db.prepare('INSERT INTO tasks (title, description, assignee_id, created_by, priority, work_date, due_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(input.title, input.description, input.assigneeId, user.id, input.priority, input.workDate, input.dueDate, now, now);
    const id = Number(result.lastInsertRowid);
    audit(ctx, user.id, 'TASK_CREATE', 'task', id);
    return get(id);
  });
  route('patch', '/:id', ({ user, body, params }) => {
    const id = parse(Id, params.id), old = get(id), input = parse(UpdateTaskInput, body);
    if (user.role === 'MEMBER' && (old.assigneeId !== user.id || (input.assigneeId !== undefined && input.assigneeId !== user.id))) throw forbidden();
    if (input.assigneeId !== undefined) active(input.assigneeId);
    const next = { ...old, ...input };
    ctx.db.prepare('UPDATE tasks SET title = ?, description = ?, assignee_id = ?, priority = ?, work_date = ?, due_date = ?, updated_at = ? WHERE id = ?')
      .run(next.title, next.description, next.assigneeId, next.priority, next.workDate, next.dueDate, ctx.now().toISOString(), id);
    audit(ctx, user.id, 'TASK_UPDATE', 'task', id);
    return get(id);
  });
  route('post', '/:id/progress', ({ user, body, params }) => {
    const id = parse(Id, params.id), old = get(id), input = parse(ProgressInput, body);
    if (user.role === 'MEMBER' && old.assigneeId !== user.id) throw forbidden();
    const now = ctx.now().toISOString();
    ctx.db.prepare('UPDATE tasks SET progress = ?, status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run(input.progress, input.status, input.progress === 100 ? now : null, now, id);
    ctx.db.prepare('INSERT INTO task_updates (task_id, user_id, progress, status, note, at) VALUES (?,?,?,?,?,?)').run(id, user.id, input.progress, input.status, input.note, now);
    audit(ctx, user.id, 'TASK_PROGRESS', 'task', id, { progress: input.progress, status: input.status });
    return get(id);
  });
  return router;
}
