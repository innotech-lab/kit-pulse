// Stany. NET-001 (liste). NET-002 (P1) coupe pour la demo.
import type { Ctx } from '../../core/context.ts';
import { createModule, todo } from '../../core/module.ts';

export default function networksModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'networks');
  route('get', '/', () => {
    const macs = ctx.db.prepare('SELECT id, network_id, kind, mac, source, note FROM network_macs ORDER BY id').all() as Record<string, unknown>[];
    return (ctx.db.prepare('SELECT id, ssid, label, is_active FROM networks ORDER BY id').all() as Record<string, unknown>[]).map((n) => ({
      id: n.id, ssid: n.ssid, label: n.label, active: n.is_active === 1,
      macs: macs.filter((m) => m.network_id === n.id).map((m) => ({ id: m.id, kind: m.kind, mac: m.mac, source: m.source, note: m.note ?? null })),
    }));
  });
  route('post', '/:id/macs', todo('NET-002')); // Ajouter une MAC
  route('delete', '/:id/macs/:macId', todo('NET-002')); // Retirer une MAC
  return router;
}
