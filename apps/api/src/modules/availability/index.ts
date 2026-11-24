// Beoline. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function availabilityModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'availability');
  route('get', '/', todo('AVL-001')); // Disponibilite de chaque personne
  route('put', '/me', todo('AVL-002')); // Changer ma disponibilite
  return router;
}
