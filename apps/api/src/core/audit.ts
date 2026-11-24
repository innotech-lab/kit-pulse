// GELE : Daniel. A appeler pour toute action sensible. Jamais de mot de passe dans detail.
import type { Ctx } from './context.ts';
export function audit(ctx: Ctx, actorId: number | null, action: string, entity: string, entityId: string | number | null, detail: unknown = null): void {
  ctx.db.prepare('INSERT INTO audit_log (actor_id, action, entity, entity_id, detail, at) VALUES (?,?,?,?,?,?)')
    .run(actorId, action, entity, entityId === null ? null : String(entityId), detail === null ? null : JSON.stringify(detail), ctx.now().toISOString());
}
