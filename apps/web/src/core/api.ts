// GELE : Alain.
export class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
/** mock : donnees affichees en developpement tant que le backend repond 501. */
export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, opts: { body?: unknown; mock?: T } = {}): Promise<T> {
  const url = path.startsWith('/__agent') ? path : `/api${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-kitpulse': '1' },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    });
  } catch { throw new ApiError(0, 'OFFLINE', 'Serveur injoignable.'); }
  if (res.status === 501 && opts.mock !== undefined && import.meta.env.DEV) return opts.mock;
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* reponse non JSON */ }
  if (!res.ok) {
    const e = (json as { error?: { code: string; message: string } } | null)?.error;
    throw new ApiError(res.status, e?.code ?? 'HTTP_ERROR', e?.message ?? `Erreur ${res.status}`);
  }
  return json as T;
}
