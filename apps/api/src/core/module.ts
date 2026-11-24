// GELE : Daniel. Les droits viennent du contrat : un module ne peut pas oublier sa protection.
import { Router, type Request, type Response } from 'express';
import type { ZodType } from 'zod';
import { ROUTES, type Method, type User } from '@kit-pulse/contracts';
import type { Ctx } from './context.ts';
import { forbidden, HttpError } from './errors.ts';
import { currentUser } from './session.ts';

export interface Call { user: User; body: unknown; params: Record<string, string>; query: unknown; req: Request; res: Response }
export type Handler = (call: Call) => unknown;

export function createModule(ctx: Ctx, name: string) {
  const router = Router();
  function route(method: Method, path: string, handler: Handler): void {
    const def = ROUTES.find((r) => r.module === name && r.method === method && r.path === path);
    if (!def) throw new Error(`Route hors contrat : ${method.toUpperCase()} /${name}${path}`);
    router[method](path, async (req: Request, res: Response) => {
      const user = currentUser(ctx, req);
      if (def.roles !== 'PUBLIC') {
        if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.');
        if (def.roles !== 'ALL' && !def.roles.includes(user.role)) throw forbidden();
      }
      const out = await handler({ user: user as User, body: req.body, params: req.params as Record<string, string>, query: req.query, req, res });
      if (res.headersSent) return;
      if (out === undefined) res.status(204).end(); else res.json(out);
    });
  }
  return { router, route };
}
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new HttpError(400, 'INVALID_INPUT', 'Donnees invalides.', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}
/** Route pas encore developpee. Le web affiche alors ses donnees de demonstration. */
export const todo = (ticket: string): Handler => () => { throw new HttpError(501, 'NOT_IMPLEMENTED', `A developper : ${ticket}`); };
