// Alain. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function agendaModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'agenda');
  route('get', '/me', todo('AGD-001')); // Mon agenda
  route('get', '/', todo('AGD-002')); // Agendas de toute une equipe
  route('post', '/', todo('AGD-003')); // Creer un evenement
  route('patch', '/:id', todo('AGD-003')); // Modifier
  route('delete', '/:id', todo('AGD-003')); // Supprimer
  return router;
}
