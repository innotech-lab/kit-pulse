// Dancile. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function justificationsModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'justifications');
  route('post', '/', todo('JUS-001')); // Justifier un retard ou une absence
  route('get', '/me', todo('JUS-001')); // Mes justifications
  route('get', '/', todo('JUS-002')); // Justifications a traiter
  route('post', '/:id/review', todo('JUS-002')); // Accepter ou refuser
  return router;
}
