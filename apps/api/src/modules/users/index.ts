// Daniel. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function usersModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'users');
  route('get', '/directory', todo('USER-001')); // Annuaire minimal des comptes actifs
  route('get', '/', todo('USER-001')); // Lister les comptes
  route('post', '/', todo('USER-002')); // Creer un compte et son ID KIT-HUB
  route('patch', '/:id', todo('USER-003')); // Modifier un compte ou son ID KIT-HUB
  route('post', '/:id/deactivate', todo('USER-004')); // Desactiver et couper les sessions
  route('post', '/:id/activate', todo('USER-004')); // Reactiver
  route('post', '/:id/reset-password', todo('USER-005')); // Reinitialiser le mot de passe
  return router;
}
