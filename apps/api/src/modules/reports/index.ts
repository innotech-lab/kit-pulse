// Daniel. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function reportsModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'reports');
  route('get', '/me', todo('REP-001')); // Mon bilan
  route('get', '/team', todo('REP-001')); // Bilan de toute une equipe
  route('get', '/users/:id', todo('REP-002')); // Bilan individuel
  return router;
}
