// GELE : Daniel (demande de Stany). Charge les MAC de .env et lit la liste autorisee.
import { normalizeMac, type KnownNetwork } from '@kit-pulse/contracts';
import { transaction } from '../../../../db/lib.ts';
import type { Ctx } from './context.ts';

export function syncNetworksFromEnv(ctx: Ctx): void {
  transaction(ctx.db, () => {
    ctx.db.exec("DELETE FROM network_macs WHERE source = 'ENV'");
    for (const n of ctx.config.networks) {
      const row = ctx.db.prepare('SELECT id FROM networks WHERE ssid = ?').get(n.ssid);
      if (!row) throw new Error(`SSID inconnu en base : ${n.ssid}`);
      for (const [kind, macs] of [['GATEWAY', n.gateways], ['BSSID', n.bssids]] as const) {
        for (const raw of macs) {
          const mac = normalizeMac(raw);
          if (!mac) throw new Error(`MAC invalide dans .env pour ${n.ssid} : ${raw}`);
          ctx.db.prepare("INSERT OR IGNORE INTO network_macs (network_id, kind, mac, source) VALUES (?,?,?,'ENV')").run(row.id as number, kind, mac);
        }
      }
    }
  });
}
export function knownNetworks(ctx: Ctx): KnownNetwork[] {
  const macs = ctx.db.prepare('SELECT network_id, kind, mac FROM network_macs').all();
  return ctx.db.prepare('SELECT id, ssid FROM networks WHERE is_active = 1 ORDER BY id').all().map((n) => ({
    id: n.id as number, ssid: n.ssid as string,
    gatewayMacs: macs.filter((m) => m.network_id === n.id && m.kind === 'GATEWAY').map((m) => m.mac as string),
    bssids: macs.filter((m) => m.network_id === n.id && m.kind === 'BSSID').map((m) => m.mac as string),
  }));
}
