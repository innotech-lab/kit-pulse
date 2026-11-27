import { z } from 'zod';
export const Role = z.enum(['ADMIN', 'HR', 'COORDINATOR', 'MEMBER']);
export type Role = z.infer<typeof Role>;
export const PunchType = z.enum(['IN', 'OUT']);
export type PunchType = z.infer<typeof PunchType>;
export const DayStatus = z.enum(['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY', 'OFF', 'PENDING']);
export const JustificationKind = z.enum(['LATE', 'ABSENCE']);
export const JustificationStatus = z.enum(['PENDING', 'ACCEPTED', 'REJECTED']);
export const TaskStatus = z.enum(['TODO', 'DOING', 'BLOCKED', 'DONE', 'CANCELLED']);
export const TaskPriority = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const AvailabilityStatus = z.enum(['FREE', 'BUSY', 'MEETING', 'FIELD', 'OFFLINE']);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatus>;
export const EventKind = z.enum(['MEETING', 'FIELD', 'FOCUS', 'OTHER']);

// Types inferes (manquaient : debloque le typecheck du web).
export type DayStatus = z.infer<typeof DayStatus>;
export type JustificationKind = z.infer<typeof JustificationKind>;
export type JustificationStatus = z.infer<typeof JustificationStatus>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskPriority = z.infer<typeof TaskPriority>;
export type EventKind = z.infer<typeof EventKind>;
