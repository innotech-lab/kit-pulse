// GELE : Daniel. Les modules sont decouverts automatiquement : personne n'edite ce fichier
// pour ajouter une route, donc aucun conflit de fusion ici.
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../../../db/lib.ts';
import type { Ctx } from './core/context.ts';
import { HttpError } from './core/errors.ts';

export async function createApp(ctx: Ctx) {
  const app = express();
  // Derriere nginx : l'IP reelle du poste vient de X-Forwarded-For (journal, limite d'essais de connexion).
  if (ctx.config.trustProxy) app.set('trust proxy', ctx.config.trustProxy);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:" });
    next();
  });
  // Le pointage d'arrivee transporte une photo (JPEG < 300 Ko) : limite plus large pour cette seule route.
  app.use('/api/presence/punch', express.json({ limit: '450kb' }));
  app.use('/api', express.json({ limit: '100kb' }));
  // Protection CSRF : cookie SameSite=Strict + en-tete impossible a poser depuis un formulaire tiers.
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && req.get('x-kitpulse') !== '1') throw new HttpError(403, 'CSRF', 'En-tete X-KitPulse manquant.');
    next();
  });
  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  const dir = resolve(import.meta.dirname, 'modules');
  for (const name of readdirSync(dir).sort()) {
    const file = resolve(dir, name, 'index.ts');
    if (!existsSync(file)) continue;
    const mod = await import(pathToFileURL(file).href);
    app.use(`/api/${name}`, mod.default(ctx));
  }
  app.use('/api', () => { throw new HttpError(404, 'NOT_FOUND', 'Route inconnue.'); });
  const dist = resolve(ROOT, 'apps/web/dist');
  if (existsSync(dist)) app.use(express.static(dist));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) { res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } }); return; }
    const status = (err as { status?: number }).status;
    if (status && status < 500) { res.status(status).json({ error: { code: 'BAD_REQUEST', message: 'Requete invalide.' } }); return; }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Erreur interne.' } });
  });
  return app;
}
