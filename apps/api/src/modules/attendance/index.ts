// Dancile. Remplacer chaque todo(...) par le vrai traitement (modele : modules/auth/index.ts).
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function attendanceModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'attendance');
  route('get', '/me', todo('ATT-001')); // Mes journees
  route('get', '/', todo('ATT-002')); // Journees de toute une equipe
  route('get', '/schedule', todo('ATT-003')); // Horaire de travail
  route('put', '/schedule', todo('ATT-003')); // Modifier les horaires
  route('get', '/holidays', todo('ATT-004')); // Jours feries
  route('post', '/holidays', todo('ATT-004')); // Ajouter un jour ferie
  return router;
}
