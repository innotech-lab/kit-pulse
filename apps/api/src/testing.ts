// GELE : Daniel. Base neuve en memoire pour chaque test : personne ne partage un etat.
import type { AddressInfo } from 'node:net';
import { migrate, openDb } from '../../../db/lib.ts';
import { seed } from '../../../db/seed/index.ts';
import { SEED_PASSWORD } from '../../../db/seed/10_users.ts';
import { createApp } from './app.ts';
import { loadConfig } from './core/config.ts';
import type { Ctx } from './core/context.ts';

export async function startTestApi(env: Record<string, string> = {}) {
  const db = openDb(':memory:');
  migrate(db); seed(db);
  let clock = new Date('2026-11-25T06:00:00.000Z');
  const ctx: Ctx = { db, config: loadConfig({ NODE_ENV: 'test', ...env }), now: () => clock };
  const app = await createApp(ctx);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  async function call(method: string, path: string, opts: { body?: unknown; cookie?: string; headers?: Record<string, string> } = {}) {
    const res = await fetch(base + path, {
      method, headers: { 'content-type': 'application/json', 'x-kitpulse': '1', ...(opts.cookie ? { cookie: opts.cookie } : {}), ...opts.headers },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null, cookie: (res.headers.get('set-cookie') ?? '').split(';')[0]! };
  }
  return {
    ctx, call,
    login: async (name: string) => (await call('POST', '/auth/login', { body: { email: `${name}@kitpulse.local`, password: SEED_PASSWORD } })).cookie,
    setClock: (iso: string) => { clock = new Date(iso); },
    close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); db.close(); }),
  };
}
