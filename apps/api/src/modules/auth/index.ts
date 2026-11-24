// Daniel. MODULE DE REFERENCE : a lire avant d'ecrire le sien.
import { LoginInput } from '@kit-pulse/contracts';
import { hashPassword, verifyPassword } from '../../../../../db/lib.ts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { HttpError } from '../../core/errors.ts';
import { createModule, parse, todo } from '../../core/module.ts';
import { closeSession, openSession, toUser } from '../../core/session.ts';

const MAX_FAILS = 8, WINDOW_MS = 15 * 60_000;
const DUMMY = hashPassword('compte-inexistant'); // meme duree de calcul si l'email n'existe pas

export default function authModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'auth');
  const fails = new Map<string, number[]>();

  route('post', '/login', ({ body, req, res }) => {
    const input = parse(LoginInput, body);
    const key = `${req.ip}|${input.email.toLowerCase()}`, now = ctx.now().getTime();
    const recent = (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_FAILS) throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Trop de tentatives. Reessayer dans 15 minutes.');
    const row = ctx.db.prepare('SELECT * FROM users WHERE email = ?').get(input.email);
    const ok = verifyPassword(input.password, (row?.password_hash as string | undefined) ?? DUMMY);
    if (!row || !ok || row.is_active !== 1) {
      fails.set(key, [...recent, now]);
      throw new HttpError(401, 'BAD_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }
    fails.delete(key);
    openSession(ctx, res, row.id as number);
    audit(ctx, row.id as number, 'LOGIN', 'user', row.id as number);
    return toUser(row);
  });
  route('post', '/logout', ({ req, res }) => { closeSession(ctx, req, res); });
  route('get', '/me', ({ user }) => user);
  route('post', '/change-password', todo('AUTH-002'));
  return router;
}
