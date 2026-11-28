// V2-L3 : fil de calcul de la reconnaissance faciale (face-api, moteur WebAssembly).
// Charge les modeles une seule fois, traite une demande a la fois. Aucun visage n'est stocke ici.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { parentPort } from 'node:worker_threads';

const require = createRequire(import.meta.url);
type Tf = typeof import('@tensorflow/tfjs');
const tf: Tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-wasm');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const faceapi: any = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const jpeg: { decode: (b: Buffer, o: { useTArray: boolean; formatAsRGBA: boolean; maxMemoryUsageInMB: number }) => { width: number; height: number; data: Uint8Array } } = require('jpeg-js');

export interface FaceResult { found: boolean; descriptor: number[] | null; yaw: number | null; score: number | null }
export type WorkerRequest = { id: number; images: Uint8Array[] };
export type WorkerResponse = { id: number; results?: FaceResult[]; error?: string };

const ready = (async () => {
  await tf.setBackend('wasm');
  await tf.ready();
  const dir = `${dirname(require.resolve('@vladmandic/face-api/package.json'))}/model`;
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(dir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(dir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(dir);
})();

/** Rotation horizontale approximative de la tete : position du nez entre les deux yeux (-1 gauche, +1 droite). */
function yawOf(points: { x: number; y: number }[]): number {
  const eyeL = points[36]!, eyeR = points[45]!, nose = points[30]!;
  const mid = (eyeL.x + eyeR.x) / 2, half = Math.max(1, (eyeR.x - eyeL.x) / 2);
  return Math.max(-1, Math.min(1, (nose.x - mid) / half));
}

async function analyse(bytes: Uint8Array): Promise<FaceResult> {
  const img = jpeg.decode(Buffer.from(bytes), { useTArray: true, formatAsRGBA: false, maxMemoryUsageInMB: 64 });
  const tensor = tf.tensor3d(img.data, [img.height, img.width, 3], 'int32');
  try {
    const r = await faceapi.detectSingleFace(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
    if (!r) return { found: false, descriptor: null, yaw: null, score: null };
    return { found: true, descriptor: Array.from(r.descriptor as Float32Array), yaw: yawOf(r.landmarks.positions), score: r.detection.score };
  } finally { tensor.dispose(); }
}

parentPort?.on('message', async (msg: WorkerRequest) => {
  try {
    await ready;
    const results: FaceResult[] = [];
    for (const img of msg.images) results.push(await analyse(img).catch(() => ({ found: false, descriptor: null, yaw: null, score: null })));
    parentPort!.postMessage({ id: msg.id, results } satisfies WorkerResponse);
  } catch (e) {
    parentPort!.postMessage({ id: msg.id, error: (e as Error).message } satisfies WorkerResponse);
  }
});
