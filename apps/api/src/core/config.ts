// GELE : Daniel.
export interface Config {
  production: boolean; host: string; port: number; timezone: string; sessionHours: number;
  networkMode: 'gateway' | 'strict'; allowSimulated: boolean; autoApproveDevices: boolean;
  networks: { ssid: string; gateways: string[]; bssids: string[] }[];
  /** Proxy HTTPS de confiance (ex. loopback pour nginx sur la meme machine) ; vide = aucun. */
  trustProxy: string;
}
const list = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const mode = env.NETWORK_CHECK_MODE || 'gateway';
  if (mode !== 'gateway' && mode !== 'strict') throw new Error('NETWORK_CHECK_MODE doit valoir gateway ou strict.');
  if (production) {
    for (const k of ['ALLOW_SIMULATED_NETWORK', 'DEV_AUTO_APPROVE_DEVICES', 'AGENT_SIMULATE_NETWORK']) {
      if (env[k] === 'true') throw new Error(`${k} est interdit en production.`);
    }
  }
  return {
    production, host: env.API_HOST || '127.0.0.1', port: Number(env.API_PORT || 4000),
    timezone: env.APP_TIMEZONE || 'Africa/Bujumbura', sessionHours: Number(env.SESSION_TTL_HOURS || 12),
    networkMode: mode, allowSimulated: !production && env.ALLOW_SIMULATED_NETWORK === 'true',
    autoApproveDevices: !production && env.DEV_AUTO_APPROVE_DEVICES === 'true',
    trustProxy: env.TRUST_PROXY ?? '',
    networks: ['1', '2'].flatMap((n) => {
      const ssid = env[`KITHUB_NET${n}_SSID`];
      return ssid ? [{ ssid, gateways: list(env[`KITHUB_NET${n}_GATEWAY_MACS`]), bssids: list(env[`KITHUB_NET${n}_BSSIDS`]) }] : [];
    }),
  };
}
