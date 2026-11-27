// CONTRAT D'API GELE. Toute evolution passe par Alain (voir docs/ANTI-CONFLITS.md).
import { z } from 'zod';
import { AvailabilityStatus, DayStatus, EventKind, JustificationKind, JustificationStatus, PunchType, Role, TaskPriority, TaskStatus } from './enums.ts';

export const Id = z.coerce.number().int().positive();
export const WorkDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue : AAAA-MM-JJ');
export const IsoDate = z.iso.datetime();
export const Range = z.object({ from: WorkDate, to: WorkDate }).refine((r) => r.from <= r.to, 'from doit preceder to');
export const RangeForUser = z.object({ from: WorkDate, to: WorkDate, userId: Id.optional() });
const text = (max: number) => z.string().trim().min(1).max(max);
export const Password = z.string().min(10).max(128);

// --- Comptes (Daniel)
export const LoginInput = z.object({ email: z.email().max(160), password: z.string().min(1).max(128) });
export const ChangePasswordInput = z.object({ current: z.string().min(1).max(128), next: Password });
export const User = z.object({
  id: Id, badgeId: z.string(), email: z.string(), fullName: z.string(), role: Role,
  jobTitle: z.string().nullable(), isActive: z.boolean(), mustChangePassword: z.boolean(),
});
export type User = z.infer<typeof User>;
export const BadgeId = z.string().trim().regex(/^[A-Z0-9-]{3,20}$/, 'Ex. KH-001');
export const CreateUserInput = z.object({ badgeId: BadgeId, email: z.email().max(160), fullName: text(120), role: Role, jobTitle: text(120).nullable().default(null), password: Password });
export const UpdateUserInput = z.object({ badgeId: BadgeId, email: z.email().max(160), fullName: text(120), role: Role, jobTitle: text(120).nullable() }).partial();
export const ResetPasswordInput = z.object({ password: Password });
export const DirectoryEntry = z.object({ id: Id, badgeId: z.string(), fullName: z.string(), jobTitle: z.string().nullable() });
export type DirectoryEntry = z.infer<typeof DirectoryEntry>;

// --- Reseau, postes, pointage (Stany)
export const AddMacInput = z.object({ kind: z.enum(['GATEWAY', 'BSSID']), mac: z.string().max(32), note: z.string().max(200).nullable().default(null) });
export const EnrollInput = z.object({ publicKey: z.string().min(40).max(400), label: text(80) });
export const ApproveDeviceInput = z.object({ kind: z.enum(['PERSONAL', 'KIOSK']) });
export const ChallengeInput = z.object({ type: PunchType });
export const PunchInput = z.object({
  attestation: z.object({
    nonce: z.string().min(20).max(100), deviceKeyId: z.string().min(10).max(100),
    gatewayMac: z.string().max(32).nullable(), bssid: z.string().max(32).nullable(), ssid: z.string().max(64).nullable(),
    simulated: z.boolean(), takenAt: IsoDate,
  }),
  signature: z.string().min(20).max(300),
});
export type PunchInput = z.infer<typeof PunchInput>;
export const Punch = z.object({ id: Id, userId: Id, type: PunchType, at: IsoDate, workDate: WorkDate, networkId: Id.nullable(), source: z.enum(['AGENT', 'MANUAL']), simulated: z.boolean() });
export type Punch = z.infer<typeof Punch>;
export const ManualPunchInput = z.object({ userId: Id, type: PunchType, at: IsoDate, reason: text(300) });

// --- Assiduite (Dancile)
export const AttendanceDay = z.object({
  userId: Id, workDate: WorkDate, status: DayStatus, minutesLate: z.number().int().min(0),
  firstIn: IsoDate.nullable(), lastOut: IsoDate.nullable(), missingOut: z.boolean(),
  justificationStatus: JustificationStatus.nullable(), justified: z.boolean(),
});
export type AttendanceDay = z.infer<typeof AttendanceDay>;
export const ScheduleDay = z.object({ weekday: z.number().int().min(1).max(7), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), graceMinutes: z.number().int().min(0).max(120) });
export const UpdateScheduleInput = z.object({ days: z.array(ScheduleDay).max(7) });
export const HolidayInput = z.object({ date: WorkDate, label: text(120) });
export const JustificationInput = z.object({ workDate: WorkDate, kind: JustificationKind, reason: text(1000) });
export const ReviewInput = z.object({ status: z.enum(['ACCEPTED', 'REJECTED']), note: z.string().max(500).nullable().default(null) });
export const Justification = z.object({ id: Id, userId: Id, workDate: WorkDate, kind: JustificationKind, reason: z.string(), status: JustificationStatus, reviewNote: z.string().nullable() });

// --- Taches et disponibilite (Beoline)
export const Task = z.object({
  id: Id, title: z.string(), description: z.string().nullable(), assigneeId: Id, createdBy: Id,
  priority: TaskPriority, status: TaskStatus, progress: z.number().int().min(0).max(100), workDate: WorkDate, dueDate: WorkDate.nullable(),
});
export type Task = z.infer<typeof Task>;
export const CreateTaskInput = z.object({ title: text(160), description: z.string().max(2000).nullable().default(null), assigneeId: Id, priority: TaskPriority.default('NORMAL'), workDate: WorkDate, dueDate: WorkDate.nullable().default(null) });
export const UpdateTaskInput = z.object({ title: text(160), description: z.string().max(2000).nullable(), assigneeId: Id, priority: TaskPriority, workDate: WorkDate, dueDate: WorkDate.nullable() }).partial();
export const ProgressInput = z.object({ progress: z.number().int().min(0).max(100), status: TaskStatus, note: z.string().max(500).nullable().default(null) });
export const Availability = z.object({ userId: Id, fullName: z.string(), status: AvailabilityStatus, note: z.string().nullable(), until: IsoDate.nullable() });
export type Availability = z.infer<typeof Availability>;
export const AvailabilityInput = z.object({ status: AvailabilityStatus, note: z.string().max(140).nullable().default(null), until: IsoDate.nullable().default(null) });

// --- Agenda (Alain)
export const AgendaEvent = z.object({ id: Id, userId: Id, title: z.string(), kind: EventKind, startsAt: IsoDate, endsAt: IsoDate, location: z.string().nullable(), taskId: Id.nullable() });
export type AgendaEvent = z.infer<typeof AgendaEvent>;
export const AgendaInput = z.object({ title: text(160), kind: EventKind, startsAt: IsoDate, endsAt: IsoDate, location: z.string().max(160).nullable().default(null), taskId: Id.nullable().default(null), userId: Id.optional() });
export const AgendaUpdateInput = z.object({ title: text(160), kind: EventKind, startsAt: IsoDate, endsAt: IsoDate, location: z.string().max(160).nullable(), taskId: Id.nullable() }).partial();

// --- Bilans (Daniel)
export const PersonReport = z.object({
  userId: Id, fullName: z.string(), expectedDays: z.number().int(), presentDays: z.number().int(),
  lateJustified: z.number().int(), lateUnjustified: z.number().int(), absentJustified: z.number().int(), absentUnjustified: z.number().int(),
  tasksPlanned: z.number().int(), tasksDone: z.number().int(), averageProgress: z.number(),
});
export type PersonReport = z.infer<typeof PersonReport>;

// Types inferes (manquaient : debloque le typecheck du web).
export type Id = z.infer<typeof Id>;
export type WorkDate = z.infer<typeof WorkDate>;
export type IsoDate = z.infer<typeof IsoDate>;
export type Range = z.infer<typeof Range>;
export type RangeForUser = z.infer<typeof RangeForUser>;
export type Password = z.infer<typeof Password>;
export type LoginInput = z.infer<typeof LoginInput>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;
export type BadgeId = z.infer<typeof BadgeId>;
export type CreateUserInput = z.infer<typeof CreateUserInput>;
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
export type AddMacInput = z.infer<typeof AddMacInput>;
export type EnrollInput = z.infer<typeof EnrollInput>;
export type ApproveDeviceInput = z.infer<typeof ApproveDeviceInput>;
export type ChallengeInput = z.infer<typeof ChallengeInput>;
export type ManualPunchInput = z.infer<typeof ManualPunchInput>;
export type ScheduleDay = z.infer<typeof ScheduleDay>;
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleInput>;
export type HolidayInput = z.infer<typeof HolidayInput>;
export type JustificationInput = z.infer<typeof JustificationInput>;
export type ReviewInput = z.infer<typeof ReviewInput>;
export type Justification = z.infer<typeof Justification>;
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
export type ProgressInput = z.infer<typeof ProgressInput>;
export type AvailabilityInput = z.infer<typeof AvailabilityInput>;
export type AgendaInput = z.infer<typeof AgendaInput>;
export type AgendaUpdateInput = z.infer<typeof AgendaUpdateInput>;
