// Stany. Lit la MAC du ROUTEUR (passerelle) et, si Windows l'autorise, le SSID et le BSSID.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeMac, SIMULATED_GATEWAY_MAC, type NetworkReading } from '@kit-pulse/contracts';
import { parseNetsh } from './parse.ts';
const run = promisify(execFile);

// Script fixe, aucune donnee utilisateur n'y est injectee.
const SCRIPT = `
$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$r=Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object { $_.RouteMetric + $_.InterfaceMetric } | Select-Object -First 1
$mac=$null
if ($r) {
  ping.exe -n 1 -w 800 $r.NextHop | Out-Null
  $n=Get-NetNeighbor -InterfaceIndex $r.ifIndex -IPAddress $r.NextHop | Where-Object { $_.State -notin 'Unreachable','Incomplete' } | Select-Object -First 1
  $mac=$n.LinkLayerAddress
}
@{ alias=$r.InterfaceAlias; gateway=$r.NextHop; mac=$mac; netsh=(netsh wlan show interfaces | Out-String) } | ConvertTo-Json -Compress
`;
export interface Probe extends NetworkReading { interfaceAlias: string | null; gatewayIp: string | null }

export async function probe(simulate: boolean): Promise<Probe> {
  if (simulate) return { gatewayMac: SIMULATED_GATEWAY_MAC, bssid: null, ssid: null, simulated: true, interfaceAlias: 'simulation', gatewayIp: null };
  if (process.platform !== 'win32') throw new Error('Agent disponible sur Windows uniquement dans le MVP.');
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT], { windowsHide: true, timeout: 20_000 });
  const raw = JSON.parse(stdout) as { alias: string | null; gateway: string | null; mac: string | null; netsh: string };
  const wifi = raw.alias ? parseNetsh(raw.netsh, raw.alias) : { ssid: null, bssid: null };
  return { gatewayMac: normalizeMac(raw.mac), ...wifi, simulated: false, interfaceAlias: raw.alias, gatewayIp: raw.gateway };
}
