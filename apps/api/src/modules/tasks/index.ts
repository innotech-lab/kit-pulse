// Beoline. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function tasksModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'tasks');
  route('get', '/me', todo('TASK-001')); // Mes taches
  route('get', '/', todo('TASK-002')); // Taches de toute une equipe
  route('post', '/', todo('TASK-003')); // Creer (pour soi, ou attribuer si ADMIN/HR/COORDINATOR)
  route('patch', '/:id', todo('TASK-003')); // Modifier
  route('post', '/:id/progress', todo('TASK-004')); // Declarer une progression
  return router;
}
