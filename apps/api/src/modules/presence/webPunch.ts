// V2-L2 : pointage sans agent. Indices : appareil (lot 1), lieu, photo, visage (lot 3). La RH valide toujours l'arrivee.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ArrivalSignals, FaceVerdict, Punch, PunchType, User, WebPunchInput } from '@kit-pulse/contracts';
import { ROOT, transaction } from '../../../../../db/lib.ts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { badRequest, conflict, HttpError } from '../../core/errors.ts';
import { notify, notifyRoles } from '../../core/notify.ts';
import { localParts } from '../../core/time.ts';
import { checkGeo } from '../attendance/site.ts';
import { checkDevice } from '../devices/webDevices.ts';
import { checkFace } from '../../face/engine.ts';

const MAX_PHOTO_BYTES = 300_000;
export type FaceCheck = (ctx: Ctx, userId: number, photo: Buffer, liveness: Buffer[]) => Promise<{ verdict: FaceVerdict; score: number | null }>;
/** Reconnaissance faciale (lot 3) ; remplacable dans les tests. */
export let faceCheck: FaceCheck = checkFace;
export function setFaceCheck(fn: FaceCheck): void { faceCheck = fn; }

const jpegBytes = (dataUrl: string) => {
  const b = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  if (b.length > MAX_PHOTO_BYTES || b[0] !== 0xff || b[1] !== 0xd8) throw badRequest('PHOTO_INVALID', 'Photo illisible. Réessayez.');
  return b;
};

export async function webPunch(ctx: Ctx, user: User, input: WebPunchInput, ip: string | null): Promise<Punch> {
  const now = ctx.now(), at = now.toISOString();
  // 1. Defi a usage unique, lie a la personne, valable 60 s (anti-rejeu) ; le type vient du defi.
  const used = ctx.db.prepare('UPDATE punch_challenges SET used_at = ? WHERE nonce = ? AND user_id = ? AND used_at IS NULL AND expires_at > ? RETURNING type').get(at, input.nonce, user.id, at) as { type: PunchType } | undefined;
  if (!used) throw new HttpError(403, 'CHALLENGE_INVALID', 'Demande expirée ou déjà utilisée. Recommencez.');
  if (used.type !== input.type) throw badRequest('WRONG_TYPE', 'Le défi ne correspond pas à ce pointage.');
  const type = used.type;
  // 2. Photo obligatoire a l'arrivee (+ images du controle du vivant).
  const photo = type === 'IN' && input.photo ? jpegBytes(input.photo) : null;
  if (type === 'IN' && !photo) throw badRequest('PHOTO_REQUIRED', 'Autorisez la webcam : une photo est demandée à l’arrivée.');
  const liveness = type === 'IN' ? input.livenessFrames.map(jpegBytes) : [];
  // 3. Indices : appareil, lieu, visage.
  const device = checkDevice(ctx, user.id, input.nonce, input.deviceKeyId, input.deviceSignature, input.fingerprint);
  const geo = checkGeo(ctx, input.geo, input.geoError);
  const face = photo ? await faceCheck(ctx, user.id, photo, liveness) : { verdict: null, score: null };
  // 4. Enregistrement a l'heure du SERVEUR. Arrivee = en attente RH ; sortie = validee d'office.
  const punch = transaction(ctx.db, () => {
    const date = localParts(now, ctx.config.timezone).date;
    const last = ctx.db.prepare("SELECT type FROM punches WHERE user_id = ? AND work_date = ? AND review_status != 'REJECTED' ORDER BY at DESC, id DESC LIMIT 1").get(user.id, date) as { type: PunchType } | undefined;
    if ((last?.type === 'IN' ? 'OUT' : 'IN') !== type) throw conflict('WRONG_ORDER', type === 'IN' ? 'Arrivée déjà pointée.' : 'Pointez d’abord votre arrivée.');
    const review = type === 'IN' ? 'PENDING' : 'APPROVED';
    const r = ctx.db.prepare(`INSERT INTO punches (user_id, type, at, work_date, ip, simulated, source, created_by, review_status,
        web_device_id, device_verdict, device_other_user_id, private_mode, face_verdict, face_score, geo_verdict, geo_lat, geo_lng, geo_accuracy_m, geo_distance_m)
      VALUES (?,?,?,?,?,0,'AGENT',?,?, ?,?,?,?, ?,?, ?,?,?,?,?)`)
      .run(user.id, type, at, date, ip, user.id, review,
        device.deviceId, device.verdict, device.otherUserId, input.privateMode === null ? null : input.privateMode ? 1 : 0,
        face.verdict, face.score, geo.verdict, geo.lat, geo.lng, geo.accuracyM, geo.distanceM);
    const id = Number(r.lastInsertRowid);
    if (photo) {
      const dir = resolve(ROOT, ctx.config.photosDir);
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, `${id}.jpg`), photo);
      ctx.db.prepare('UPDATE punches SET photo_file = ? WHERE id = ?').run(`${id}.jpg`, id);
    }
    return { id, userId: user.id, type, at, workDate: date, networkId: null, source: 'AGENT' as const, simulated: false, reviewStatus: review as Punch['reviewStatus'], reviewNote: null };
  });
  audit(ctx, user.id, type === 'IN' ? 'WEB_PUNCH_IN' : 'WEB_PUNCH_OUT', 'punch', punch.id, { device: device.verdict, geo: geo.verdict, face: face.verdict });
  // 5. Notifications.
  const hhmm = localParts(now, ctx.config.timezone).time;
  if (type === 'IN') notifyRoles(ctx, ['ADMIN', 'HR'], { kind: 'ARRIVAL_TO_REVIEW', title: `Arrivée de ${user.fullName} à ${hhmm}`, body: 'À valider', link: '#arrivees' }, user.id);
  if (device.verdict === 'OTHER' || device.verdict === 'LIKE_OTHER') {
    const other = (ctx.db.prepare('SELECT full_name FROM users WHERE id = ?').get(device.otherUserId) as { full_name: string } | undefined)?.full_name ?? 'un collègue';
    const certain = device.verdict === 'OTHER';
    const n = { kind: 'DEVICE_USED_BY_OTHER' as const, title: `${user.fullName} a pointé ${certain ? 'depuis l’appareil' : 'depuis un appareil qui ressemble à celui'} de ${other}`, body: `${type === 'IN' ? 'Arrivée' : 'Départ'} à ${hhmm}`, link: '#arrivees' };
    notifyRoles(ctx, ['ADMIN', 'HR'], n, user.id);
    if (certain && device.otherUserId) notify(ctx, [device.otherUserId], { ...n, title: `Votre appareil « ${device.label} » a servi à ${user.fullName}`, link: null });
  }
  return punch;
}

/** Indices d'une arrivee pour la RH (lot 5). */
export function arrivalSignals(ctx: Ctx, punchId: number): ArrivalSignals | null {
  const p = ctx.db.prepare(`SELECT p.*, d.label AS device_label, o.full_name AS other_name FROM punches p
    LEFT JOIN web_devices d ON d.id = p.web_device_id LEFT JOIN users o ON o.id = p.device_other_user_id WHERE p.id = ?`).get(punchId) as Record<string, unknown> | undefined;
  if (!p) return null;
  const device = { verdict: (p.device_verdict as ArrivalSignals['device']['verdict']) ?? null, label: (p.device_label as string | null) ?? null, otherUserName: (p.other_name as string | null) ?? null };
  const face = { verdict: (p.face_verdict as ArrivalSignals['face']['verdict']) ?? null, score: (p.face_score as number | null) ?? null };
  const geo = { verdict: (p.geo_verdict as ArrivalSignals['geo']['verdict']) ?? null, distanceM: (p.geo_distance_m as number | null) ?? null, accuracyM: (p.geo_accuracy_m as number | null) ?? null };
  return { device, privateMode: p.private_mode === null || p.private_mode === undefined ? null : p.private_mode === 1, face, geo,
    highConfidence: device.verdict === 'OWN' && face.verdict === 'MATCH' && geo.verdict === 'INSIDE' && p.private_mode !== 1 };
}
