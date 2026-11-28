// Daniel. Comptes et IDs KIT-HUB (USER-001 a USER-005).
import { CreateUserInput, EmailDomainInput, Id, ResetPasswordInput, UpdateUserInput, type DirectoryEntry } from '@kit-pulse/contracts';
import { hashPassword, transaction } from '../../../../../db/lib.ts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { badRequest, conflict, notFound } from '../../core/errors.ts';
import { createModule, parse, todo } from '../../core/module.ts';
import { notify } from '../../core/notify.ts';
import { closeAllSessions, toUser } from '../../core/session.ts';

export default function usersModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'users');
  const byId = (id: number) => {
    const row = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) throw notFound('Compte introuvable.');
    return row;
  };
  const assertUnique = (email: string | undefined, badgeId: string | undefined, exceptId = 0) => {
    if (email && ctx.db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, exceptId)) throw conflict('EMAIL_TAKEN', 'Cet email est deja utilise.');
    if (badgeId && ctx.db.prepare('SELECT id FROM users WHERE badge_id = ? AND id != ?').get(badgeId, exceptId)) throw conflict('BADGE_TAKEN', 'Cet ID KIT-HUB est deja attribue.');
  };

  route('get', '/directory', (): DirectoryEntry[] =>
    (ctx.db.prepare('SELECT id, badge_id, full_name, job_title FROM users WHERE is_active = 1 ORDER BY full_name').all() as Record<string, unknown>[])
      .map((r) => ({ id: r.id as number, badgeId: r.badge_id as string, fullName: r.full_name as string, jobTitle: (r.job_title as string | null) ?? null })));
  route('get', '/email-domain', () => ({ domain: ctx.db.prepare("SELECT value FROM settings WHERE key = 'email_domain'").get()!.value as string }));
  route('put', '/email-domain', ({ body, user }) => {
    const { domain } = parse(EmailDomainInput, body);
    ctx.db.prepare("UPDATE settings SET value = ? WHERE key = 'email_domain'").run(domain);
    audit(ctx, user.id, 'EMAIL_DOMAIN_SET', 'settings', 'email_domain', { domain });
    return { domain };
  });
  route('get', '/', () => (ctx.db.prepare('SELECT * FROM users ORDER BY is_active DESC, full_name').all() as Record<string, unknown>[]).map(toUser));
  route('post', '/', ({ body, user, res }) => {
    const input = parse(CreateUserInput, body);
    const now = ctx.now().toISOString();
    const passwordHash = hashPassword(input.password);
    const id = transaction(ctx.db, () => {
      const ids = ctx.db.prepare('SELECT badge_id FROM users').all().map((r) => /^KH-(\d+)$/.exec(r.badge_id as string)).filter((m) => m !== null).map((m) => Number(m[1]));
      const badgeId = input.badgeId ?? `KH-${String(Math.max(0, ...ids) + 1).padStart(3, '0')}`;
      assertUnique(input.email, badgeId);
      const r = ctx.db.prepare('INSERT INTO users (badge_id, email, full_name, role, job_title, password_hash, must_change_password, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)')
        .run(badgeId, input.email, input.fullName, input.role, input.jobTitle, passwordHash, now, now);
      const createdId = Number(r.lastInsertRowid);
      audit(ctx, user.id, 'USER_CREATE', 'user', createdId, { badgeId, role: input.role });
      return createdId;
    });
    res.status(201);
    return toUser(byId(id));
  });
  route('patch', '/:id', ({ params, body, user }) => {
    const id = parse(Id, params.id);
    const input = parse(UpdateUserInput, body);
    byId(id);
    if (id === user.id && input.role && input.role !== user.role) throw badRequest('OWN_ROLE', 'On ne change pas son propre role.');
    assertUnique(input.email, input.badgeId, id);
    const cols: Record<string, unknown> = { badge_id: input.badgeId, email: input.email, full_name: input.fullName, role: input.role, job_title: input.jobTitle };
    const set = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (set.length) {
      ctx.db.prepare(`UPDATE users SET ${set.map(([k]) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...set.map(([, v]) => v as string | null), ctx.now().toISOString(), id);
      audit(ctx, user.id, 'USER_UPDATE', 'user', id, input);
    }
    return toUser(byId(id));
  });
  route('post', '/:id/deactivate', ({ params, user }) => {
    const id = parse(Id, params.id);
    byId(id);
    if (id === user.id) throw badRequest('SELF_DEACTIVATE', 'On ne desactive pas son propre compte.');
    ctx.db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(ctx.now().toISOString(), id);
    closeAllSessions(ctx, id);
    audit(ctx, user.id, 'USER_DEACTIVATE', 'user', id);
    return toUser(byId(id));
  });
  route('post', '/:id/activate', ({ params, user }) => {
    const id = parse(Id, params.id);
    byId(id);
    ctx.db.prepare('UPDATE users SET is_active = 1, updated_at = ? WHERE id = ?').run(ctx.now().toISOString(), id);
    audit(ctx, user.id, 'USER_ACTIVATE', 'user', id);
    return toUser(byId(id));
  });
  route('post', '/:id/reset-password', ({ params, body, user }) => {
    const id = parse(Id, params.id);
    const { password } = parse(ResetPasswordInput, body);
    byId(id);
    ctx.db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?').run(hashPassword(password), ctx.now().toISOString(), id);
    closeAllSessions(ctx, id);
    audit(ctx, user.id, 'USER_RESET_PASSWORD', 'user', id);
    notify(ctx, [id], { kind: 'PASSWORD_RESET', title: 'Mot de passe réinitialisé', body: 'Votre mot de passe a été réinitialisé par un administrateur.', link: null });
  });
  // --- V2-L4 (Codex) : visage enregistre chez l admin ---
  route('get', '/:id/face', todo('V2-L4'));
  route('post', '/:id/face', todo('V2-L4'));
  route('delete', '/:id/face', todo('V2-L4'));
  return router;
}
