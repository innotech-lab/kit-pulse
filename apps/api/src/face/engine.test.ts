import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startTestApi } from '../testing.ts';
import { after } from 'node:test';
import { analyse, buildTemplate, checkFace, distance, fromBlob, scoreOf, stopEngine, toBlob } from './engine.ts';

after(() => stopEngine());

const require = createRequire(import.meta.url);
const jpeg: { encode: (i: { data: Buffer; width: number; height: number }, q: number) => { data: Buffer } } = require('jpeg-js');
/** Photo sans visage (gris uni), vraie image JPEG. */
const blank = () => jpeg.encode({ data: Buffer.alloc(320 * 240 * 4, 128), width: 320, height: 240 }, 80).data;

test('V2-L3 : distance, score et stockage des empreintes', () => {
  const a = Array.from({ length: 128 }, (_, i) => i / 128), b = a.map((v) => v + 0.01);
  assert.ok(Math.abs(distance(a, b) - Math.sqrt(128 * 0.0001)) < 1e-9);
  assert.equal(scoreOf(0), 1); assert.equal(scoreOf(1.4), 0);
  const back = fromBlob(toBlob(a));
  assert.ok(back.every((v, i) => Math.abs(v - a[i]!) < 1e-6));
});

test('V2-L3 : moteur reel (modeles face-api) : aucun visage sur une image vide, empreinte refusee', { timeout: 120_000 }, async () => {
  const [r] = await analyse([blank()]);
  assert.equal(r!.found, false);
  assert.deepEqual(await buildTemplate([blank(), blank(), blank()]), { error: 'NOT_ENOUGH_FACES' });
  const api = await startTestApi();
  try {
    assert.deepEqual(await checkFace(api.ctx, 4, blank(), []), { verdict: 'NO_TEMPLATE', score: null });
    api.ctx.db.prepare('INSERT INTO face_templates (user_id, embedding, model, samples, consent_at, enrolled_by, created_at) VALUES (4, ?, ?, 3, ?, 1, ?)')
      .run(toBlob(Array(128).fill(0.1)), 'test', '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z');
    assert.deepEqual(await checkFace(api.ctx, 4, blank(), []), { verdict: 'NO_FACE', score: null });
  } finally { await api.close(); }
});
