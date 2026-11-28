// V2-L2 : lieu du KiT Hub (reglages) et verdict de localisation d'un pointage.
import type { GeoVerdict, SiteLocation } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';

const get = (ctx: Ctx, key: string) => (ctx.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? '';
const num = (v: string) => (v.trim() === '' ? null : Number(v));

export function siteLocation(ctx: Ctx): SiteLocation {
  return { lat: num(get(ctx, 'site_lat')), lng: num(get(ctx, 'site_lng')), radiusM: num(get(ctx, 'site_radius_m')) ?? 100 };
}
export function saveSiteLocation(ctx: Ctx, s: SiteLocation): void {
  const set = ctx.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  set.run('site_lat', s.lat === null ? '' : String(s.lat));
  set.run('site_lng', s.lng === null ? '' : String(s.lng));
  set.run('site_radius_m', String(s.radiusM));
}

/** Distance en metres entre deux points GPS (formule de haversine). */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000, rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface GeoCheck { verdict: GeoVerdict; distanceM: number | null; accuracyM: number | null; lat: number | null; lng: number | null }

/**
 * INSIDE si le cercle de precision touche la zone du KiT Hub (distance - precision <= rayon) :
 * un PC localise par Wi-Fi a 60 m pres, a 120 m du centre avec un rayon de 100 m, est accepte.
 */
export function checkGeo(ctx: Ctx, geo: { lat: number; lng: number; accuracy: number } | null, error: 'DENIED' | 'UNAVAILABLE' | null): GeoCheck {
  const site = siteLocation(ctx);
  if (!geo) return { verdict: error ?? 'UNAVAILABLE', distanceM: null, accuracyM: null, lat: null, lng: null };
  const base = { accuracyM: Math.round(geo.accuracy), lat: geo.lat, lng: geo.lng };
  if (site.lat === null || site.lng === null) return { verdict: 'NOT_CONFIGURED', distanceM: null, ...base };
  const d = Math.round(distanceM(site.lat, site.lng, geo.lat, geo.lng));
  return { verdict: d - geo.accuracy <= site.radiusM ? 'INSIDE' : 'OUTSIDE', distanceM: d, ...base };
}
