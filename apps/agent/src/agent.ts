import { resolve } from 'node:path';
import { loadEnv, ROOT } from '../../../db/lib.ts';
import { loadKeys } from './keys.ts';
import { probe } from './probe.ts';
import { createAgent } from './server.ts';
loadEnv();
const port = Number(process.env.AGENT_PORT || 47820);
const simulate = process.env.AGENT_SIMULATE_NETWORK === 'true' && process.env.NODE_ENV !== 'production';
const agent = createAgent({
  port, upstream: process.env.AGENT_SERVER_URL || 'http://127.0.0.1:4000',
  extraOrigins: process.env.NODE_ENV === 'production' ? [] : (process.env.AGENT_EXTRA_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  keys: loadKeys(resolve(ROOT, process.env.AGENT_DATA_DIR || './.agent-data')),
  read: () => probe(simulate),
});
// 127.0.0.1 uniquement : jamais visible du reseau.
agent.listen(port, '127.0.0.1', () => console.log(`Agent KIT-Pulse : http://127.0.0.1:${port}${simulate ? ' (RESEAU SIMULE)' : ''}`));
