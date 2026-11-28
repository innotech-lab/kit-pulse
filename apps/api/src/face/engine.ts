// V2-L3 : reconnaissance faciale. File d'attente vers un fil de calcul unique (voir worker.ts).
// Les empreintes (128 nombres) sont comparees par distance euclidienne. Aucune photo d'enregistrement n'est gardee.
import { Worker } from 'node:worker_threads';
import type { FaceVerdict } from '@kit-pulse/contracts';
import type { Ctx } from '../core/context.ts';
import type { FaceResult, WorkerRequest, WorkerResponse } from './worker.ts';

/** Distance maximale pour « reconnu ». 0,6 est la valeur usuelle de face-api ; 0,5 est plus strict (moins de faux « reconnu »). */
export const MATCH_DISTANCE = Number(process.env.FACE_MATCH_DISTANCE || 0.5);
/** Ecart de rotation de tete minimal entre les images du controle du vivant. */
export const LIVENESS_MIN_YAW = Number(process.env.FACE_LIVENESS_MIN_YAW || 0.25);
const TIMEOUT_MS = 30_000;
export const MODEL = 'face-api-1.7/ssd-mobilenet+recognition-128';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (r: FaceResult[]) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
let queue: Promise<unknown> = Promise.resolve();

function start(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./worker.ts', import.meta.url));
  w.unref();
  w.on('message', (m: WorkerResponse) => {
    const p = pending.get(m.id); if (!p) return;
    pending.delete(m.id); clearTimeout(p.timer);
    if (m.error || !m.results) p.reject(new Error(m.error ?? 'Analyse impossible')); else p.resolve(m.results);
  });
  const fail = (e: Error) => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(e); } pending.clear(); worker = null; };
  w.on('error', fail);
  w.on('exit', (code) => { if (code) fail(new Error(`Moteur arrete (${code})`)); worker = null; });
  worker = w;
  return w;
}

/** Analyse des images, une demande a la fois (le VPS est partage avec d'autres sites). */
export function analyse(images: Buffer[]): Promise<FaceResult[]> {
  const run = () => new Promise<FaceResult[]>((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Délai dépassé')); }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    start().postMessage({ id, images: images.map((b) => new Uint8Array(b)) } satisfies WorkerRequest);
  });
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

export const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]!) ** 2, 0));
/** Score lisible pour la RH : 100 % = identique, 0 % au seuil de distance 1. */
export const scoreOf = (d: number) => Math.max(0, Math.min(1, 1 - d));

export const toBlob = (v: number[]) => Buffer.from(new Float32Array(v).buffer);
export const fromBlob = (b: Uint8Array) => Array.from(new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4));

/** Empreinte de reference a partir de 3 a 5 photos (moyenne des visages trouves, coherents entre eux). */
export async function buildTemplate(photos: Buffer[]): Promise<{ descriptor: number[]; samples: number } | { error: 'NOT_ENOUGH_FACES' | 'INCONSISTENT' }> {
  const found = (await analyse(photos)).filter((r) => r.found && r.descriptor).map((r) => r.descriptor!);
  if (found.length < 3) return { error: 'NOT_ENOUGH_FACES' };
  const mean = found[0]!.map((_, i) => found.reduce((s, d) => s + d[i]!, 0) / found.length);
  if (found.some((d) => distance(d, mean) > MATCH_DISTANCE)) return { error: 'INCONSISTENT' };
  return { descriptor: mean, samples: found.length };
}

/**
 * Verdict d'une arrivee : visage de la photo compare a l'empreinte enregistree,
 * puis controle du vivant (la tete doit tourner entre les images, et ce doit etre la meme personne).
 */
export async function checkFace(ctx: Ctx, userId: number, photo: Buffer, liveness: Buffer[]): Promise<{ verdict: FaceVerdict; score: number | null }> {
  const t = ctx.db.prepare('SELECT embedding FROM face_templates WHERE user_id = ?').get(userId) as { embedding: Uint8Array } | undefined;
  if (!t) return { verdict: 'NO_TEMPLATE', score: null };
  if (process.env.FACE_ENGINE === 'off') return { verdict: 'UNAVAILABLE', score: null };
  let results: FaceResult[];
  try { results = await analyse([photo, ...liveness]); } catch { return { verdict: 'UNAVAILABLE', score: null }; }
  const [main, ...frames] = results;
  if (!main?.found || !main.descriptor) return { verdict: 'NO_FACE', score: null };
  const ref = fromBlob(t.embedding);
  const score = Math.round(scoreOf(distance(main.descriptor, ref)) * 100) / 100;
  if (distance(main.descriptor, ref) > MATCH_DISTANCE) return { verdict: 'NO_MATCH', score };
  const live = [main, ...frames].filter((f) => f.found && f.descriptor && distance(f.descriptor, ref) <= MATCH_DISTANCE && f.yaw !== null);
  const yaws = live.map((f) => f.yaw!);
  const moved = yaws.length >= 2 && Math.max(...yaws) - Math.min(...yaws) >= LIVENESS_MIN_YAW;
  return { verdict: moved ? 'MATCH' : 'LIVENESS_FAIL', score };
}

/** Arrete le fil de calcul (fin des tests, arret propre du serveur). Il redemarre seul a la prochaine analyse. */
export async function stopEngine(): Promise<void> {
  const w = worker; worker = null;
  if (w) await w.terminate();
}
