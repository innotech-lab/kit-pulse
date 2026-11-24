// GELE : Daniel. Sessions opaques, revocables immediatement (desactivation de compte).
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type { User } from '@kit-pulse/contracts';
import type { Ctx } from './context.ts';
const COOKIE = 'kp_session';
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

export function toUser(r: Record<string, unknown>): User {
  return {
    id: r.id as number, badgeId: r.badge_id as string, email: r.email as string, fullName: r.full_name as string, role: r.role as User['role'],
    jobTitle: (r.job_title as string | null) ?? null, isActive: r.is_active === 1, mustChangePassword: r.must_change_password === 1,
  };
}
function readToken(req: Request): string | null {
  const m = /(?:^|;\s*)kp_session=([A-Za-z0-9_-]{20,})/.exec(req.headers.cookie ?? '');
  return m ? m[1]! : null;
}
export function openSession(ctx: Ctx, res: Response, userId: number): void {
  const token = randomBytes(32).toString('base64url');
  const now = ctx.now(), maxAge = ctx.config.sessionHours * 3_600_000;
  ctx.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now.toISOString());
  ctx.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(hash(token), userId, now.toISOString(), new Date(now.getTime() + maxAge).toISOString());
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: ctx.config.production, maxAge, path: '/' });
}
export function closeSession(ctx: Ctx, req: Request, res: Response): void {
  const token = readToken(req);
  if (token) ctx.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token));
  res.clearCookie(COOKIE, { path: '/' });
}
export function closeAllSessions(ctx: Ctx, userId: number): void {
  ctx.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
export function currentUser(ctx: Ctx, req: Request): User | null {
  const token = readToken(req);
  if (!token) return null;
  const row = ctx.db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1').get(hash(token), ctx.now().toISOString());
  return row ? toUser(row) : null;
}
