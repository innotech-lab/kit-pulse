// Regles pures sur les MAC. Partagees par l'agent et l'API.
export function normalizeMac(input: string | null | undefined): string | null {
  if (!input) return null;
  const hex = input.trim().toLowerCase().replace(/[-:.]/g, '');
  if (!/^[0-9a-f]{12}$/.test(hex)) return null;
  if (hex === '000000000000' || hex === 'ffffffffffff') return null;
  // Bit multicast : une interface de routeur n'a jamais une telle adresse.
  if (parseInt(hex.slice(0, 2), 16) & 1) return null;
  return hex.match(/../g)!.join(':');
}

export interface NetworkReading {
  gatewayMac: string | null;
  bssid: string | null;
  ssid: string | null;
  simulated: boolean;
}
export interface KnownNetwork {
  id: number;
  ssid: string;
  gatewayMacs: string[];
  bssids: string[];
}
export type NetworkRejection =
  | 'NETWORK_NOT_CONFIGURED' | 'GATEWAY_MAC_UNREADABLE' | 'GATEWAY_MAC_UNKNOWN'
  | 'SSID_MISMATCH' | 'BSSID_REQUIRED' | 'BSSID_UNKNOWN';
export type NetworkVerdict =
  | { ok: true; networkId: number }
  | { ok: false; reason: NetworkRejection };

const sameSsid = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function checkNetwork(
  reading: NetworkReading, networks: KnownNetwork[], mode: 'gateway' | 'strict',
): NetworkVerdict {
  // Refus par defaut : sans MAC enregistree, le nom du Wi-Fi ne suffit JAMAIS.
  if (!networks.some((n) => n.gatewayMacs.length > 0)) return { ok: false, reason: 'NETWORK_NOT_CONFIGURED' };
  const mac = normalizeMac(reading.gatewayMac);
  if (!mac) return { ok: false, reason: 'GATEWAY_MAC_UNREADABLE' };
  const candidates = networks.filter((n) => n.gatewayMacs.includes(mac));
  if (candidates.length === 0) return { ok: false, reason: 'GATEWAY_MAC_UNKNOWN' };
  if (mode === 'strict' && !reading.ssid) return { ok: false, reason: 'SSID_MISMATCH' };
  const matching = reading.ssid ? candidates.filter((n) => sameSsid(n.ssid, reading.ssid!)) : candidates;
  if (matching.length === 0) return { ok: false, reason: 'SSID_MISMATCH' };
  if (mode === 'strict') {
    const bssid = normalizeMac(reading.bssid);
    if (!bssid) return { ok: false, reason: 'BSSID_REQUIRED' };
    const strict = matching.find((n) => n.bssids.includes(bssid));
    return strict ? { ok: true, networkId: strict.id } : { ok: false, reason: 'BSSID_UNKNOWN' };
  }
  return { ok: true, networkId: matching[0]!.id };
}

export interface Attestation extends NetworkReading {
  nonce: string;
  deviceKeyId: string;
  takenAt: string;
}
/** Texte exact signe par l'agent (Ed25519) et verifie par l'API. Ne pas changer l'ordre. */
export function attestationPayload(a: Attestation): string {
  return JSON.stringify(['kit-pulse/1', a.nonce, a.deviceKeyId, a.gatewayMac, a.bssid, a.ssid, a.simulated, a.takenAt]);
}
/** Adresse localement administree, volontairement fictive : jamais celle d'un vrai routeur KIT-HUB. */
export const SIMULATED_GATEWAY_MAC = '02:00:00:00:00:01';
