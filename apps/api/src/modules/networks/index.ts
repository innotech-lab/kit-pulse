// Stany. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function networksModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'networks');
  route('get', '/', todo('NET-001')); // Lister reseaux et MAC
  route('post', '/:id/macs', todo('NET-002')); // Ajouter une MAC
  route('delete', '/:id/macs/:macId', todo('NET-002')); // Retirer une MAC
  return router;
}
