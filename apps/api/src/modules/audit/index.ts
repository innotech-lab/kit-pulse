// Beoline. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function auditModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'audit');
  route('get', '/', todo('AUDIT-001')); // Journal des actions
  return router;
}
