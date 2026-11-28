// V2 : pointage sans agent, appareils, visage, lieu, notifications. Voir docs/PLAN-V2-POINTAGE-WEB.md.
import { z } from 'zod';
import { PunchType } from './enums.ts';
import { Id, IsoDate } from './schemas.ts';

const jpeg = z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(400_000);

// ---------- Appareils (lot 1, C) ----------
/** Cle publique ECDSA P-256 (SPKI, base64) creee par le navigateur, non extractible cote client. */
export const WebDeviceRegisterInput = z.object({
  publicKey: z.string().min(40).max(400),
  label: z.string().trim().min(1).max(80),
  /** Empreinte de secours (hash hexadecimal) : sert seulement a dire « ressemble a l'appareil de… ». */
  fingerprint: z.string().regex(/^[a-f0-9]{16,128}$/).nullable().default(null),
});
export type WebDeviceRegisterInput = z.infer<typeof WebDeviceRegisterInput>;
export const WebDeviceStatus = z.enum(['PENDING', 'APPROVED', 'REVOKED']);
export const WebDevice = z.object({
  id: Id, keyId: z.string(), ownerId: Id, ownerName: z.string(), label: z.string(), status: WebDeviceStatus,
  createdAt: IsoDate, lastSeenAt: IsoDate.nullable(), hasPasskey: z.boolean(),
});
export type WebDevice = z.infer<typeof WebDevice>;
/** Fiche d'un appareil : qui l'a utilise (traçabilite « appareil de [collegue] »). */
export const WebDeviceDetail = WebDevice.extend({
  usedBy: z.array(z.object({ userId: Id, fullName: z.string(), punches: z.number().int(), lastAt: IsoDate })),
});
export type WebDeviceDetail = z.infer<typeof WebDeviceDetail>;

// ---------- Pointage web (lot 2, C) ----------
export const DeviceVerdict = z.enum(['OWN', 'OTHER', 'LIKE_OTHER', 'UNKNOWN']);
export type DeviceVerdict = z.infer<typeof DeviceVerdict>;
export const FaceVerdict = z.enum(['MATCH', 'NO_MATCH', 'NO_FACE', 'NO_TEMPLATE', 'LIVENESS_FAIL', 'UNAVAILABLE']);
export type FaceVerdict = z.infer<typeof FaceVerdict>;
export const GeoVerdict = z.enum(['INSIDE', 'OUTSIDE', 'DENIED', 'UNAVAILABLE', 'NOT_CONFIGURED']);
export type GeoVerdict = z.infer<typeof GeoVerdict>;
export const WebPunchInput = z.object({
  type: PunchType,
  /** Defi obtenu par POST /presence/challenge, signe par la cle de l'appareil. */
  nonce: z.string().min(20).max(100),
  deviceKeyId: z.string().min(10).max(100).nullable(),
  deviceSignature: z.string().min(20).max(400).nullable(),
  fingerprint: z.string().regex(/^[a-f0-9]{16,128}$/).nullable().default(null),
  privateMode: z.boolean().nullable().default(null),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().min(0).max(100_000) }).nullable(),
  geoError: z.enum(['DENIED', 'UNAVAILABLE']).nullable().default(null),
  /** Arrivee : photo + quelques images pour le controle du « vivant ». Ignores pour une sortie. */
  photo: jpeg.nullable().default(null),
  livenessFrames: z.array(jpeg).max(6).default([]),
});
export type WebPunchInput = z.infer<typeof WebPunchInput>;
/** Indices d'une arrivee, montres a la RH (lot 5, X). */
export const ArrivalSignals = z.object({
  device: z.object({ verdict: DeviceVerdict.nullable(), label: z.string().nullable(), otherUserName: z.string().nullable() }),
  privateMode: z.boolean().nullable(),
  face: z.object({ verdict: FaceVerdict.nullable(), score: z.number().nullable() }),
  geo: z.object({ verdict: GeoVerdict.nullable(), distanceM: z.number().nullable(), accuracyM: z.number().nullable() }),
  /** Appareil a la personne + visage reconnu + dans l'enceinte. */
  highConfidence: z.boolean(),
});
export type ArrivalSignals = z.infer<typeof ArrivalSignals>;

// ---------- Lieu du KiT Hub (lot 2, C) ----------
export const SiteLocation = z.object({ lat: z.number().min(-90).max(90).nullable(), lng: z.number().min(-180).max(180).nullable(), radiusM: z.number().int().min(20).max(5000) });
export type SiteLocation = z.infer<typeof SiteLocation>;

// ---------- Visage (lots 3 C et 4 X) ----------
export const FaceEnrollInput = z.object({
  photos: z.array(jpeg).min(3).max(5),
  /** L'admin confirme avoir recueilli le consentement ecrit de la personne. */
  consent: z.literal(true),
});
export type FaceEnrollInput = z.infer<typeof FaceEnrollInput>;
export const FaceStatus = z.object({ enrolled: z.boolean(), enrolledAt: IsoDate.nullable(), enrolledBy: z.string().nullable(), samples: z.number().int() });
export type FaceStatus = z.infer<typeof FaceStatus>;

// ---------- Notifications (lot 6, X) ----------
export const NotificationKind = z.enum([
  'TASK_ASSIGNED', 'TASK_UPDATED', 'JUSTIFICATION_SUBMITTED', 'JUSTIFICATION_DECIDED', 'ARRIVAL_TO_REVIEW', 'ARRIVAL_REJECTED',
  'DEVICE_USED_BY_OTHER', 'PASSWORD_RESET', 'AGENDA_EVENT_ADDED', 'DEVICE_TO_APPROVE',
]);
export type NotificationKind = z.infer<typeof NotificationKind>;
export const Notification = z.object({
  id: Id, kind: NotificationKind, title: z.string(), body: z.string().nullable(),
  /** Route du web vers le sujet, ex. « #arrivees » ou « #tasks ». */
  link: z.string().nullable(), createdAt: IsoDate, readAt: IsoDate.nullable(),
});
export type Notification = z.infer<typeof Notification>;
export const NotificationList = z.object({ unread: z.number().int(), read: z.number().int(), items: z.array(Notification) });
export type NotificationList = z.infer<typeof NotificationList>;
