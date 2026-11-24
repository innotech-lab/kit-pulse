// Stany. Lecture de la sortie Windows, independante de la langue (FR/EN).
import { normalizeMac } from '@kit-pulse/contracts';

/** netsh traduit ses libelles (en francais, le BSSID s'appelle "Point d'acces d'identificateur SSID").
 *  On se repere donc a la structure : la premiere valeur MAC APRES la ligne SSID est le BSSID.
 *  L'adresse physique du PC est AVANT la ligne SSID : elle est ignoree. */
export function parseNetsh(output: string, interfaceAlias: string): { ssid: string | null; bssid: string | null } {
  const lines = output.split(/\r?\n/);
  let inBlock = false, ssid: string | null = null;
  for (const line of lines) {
    const m = /^\s*(.+?)\s*:\s(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!, value = m[2]!.trim();
    if (value === interfaceAlias && !/profil/i.test(key)) { inBlock = true; ssid = null; continue; }
    if (!inBlock) continue;
    if (/^SSID$/i.test(key)) { ssid = value || null; continue; }
    if (ssid && normalizeMac(value)) return { ssid, bssid: normalizeMac(value) };
  }
  return { ssid, bssid: null };
}
