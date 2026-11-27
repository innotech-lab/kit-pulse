// Dancile. SEULE porte d'entree pour les autres modules (reports). Signature gelee.
import type { AttendanceDay } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';
import { badRequest } from '../../core/errors.ts';
import { localParts } from '../../core/time.ts';

const MAX_DAYS = 400;
type JustStatus = AttendanceDay['justificationStatus'];

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Journees d'une personne entre from et to inclus (dates locales KIT-HUB). */
export function computeDays(ctx: Ctx, userId: number, from: string, to: string): AttendanceDay[] {
  if (from > to) throw badRequest('INVALID_RANGE', 'from doit preceder to.');
  const tz = ctx.config.timezone;
  const today = localParts(ctx.now(), tz).date;

  // On ne compte pas de journees avant l'arrivee de la personne (creation du compte ou premier pointage).
  const user = ctx.db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId) as { created_at: string } | undefined;
  if (!user) return [];
  const first = ctx.db.prepare('SELECT MIN(work_date) AS d FROM punches WHERE user_id = ?').get(userId) as { d: string | null };
  const created = localParts(new Date(user.created_at), tz).date;
  const arrival = first.d && first.d < created ? first.d : created;
  const start = from < arrival ? arrival : from;
  if (start > to) return [];

  const schedule = new Map<number, { start: string; grace: number }>();
  for (const r of ctx.db.prepare('SELECT weekday, start_time, grace_minutes FROM work_schedule').all() as { weekday: number; start_time: string; grace_minutes: number }[]) {
    schedule.set(r.weekday, { start: r.start_time, grace: r.grace_minutes });
  }
  const holidays = new Set((ctx.db.prepare('SELECT date FROM holidays WHERE date BETWEEN ? AND ?').all(start, to) as { date: string }[]).map((h) => h.date));
  const punches = ctx.db.prepare('SELECT type, at, work_date FROM punches WHERE user_id = ? AND work_date BETWEEN ? AND ? ORDER BY at').all(userId, start, to) as { type: 'IN' | 'OUT'; at: string; work_date: string }[];
  const byDay = new Map<string, { type: 'IN' | 'OUT'; at: string }[]>();
  for (const p of punches) { const l = byDay.get(p.work_date) ?? []; l.push(p); byDay.set(p.work_date, l); }
  const justs = new Map<string, JustStatus>();
  for (const j of ctx.db.prepare('SELECT work_date, kind, status FROM justifications WHERE user_id = ? AND work_date BETWEEN ? AND ?').all(userId, start, to) as { work_date: string; kind: string; status: JustStatus }[]) {
    justs.set(`${j.work_date}|${j.kind}`, j.status);
  }

  const days: AttendanceDay[] = [];
  for (let date = start, i = 0; date <= to && i < MAX_DAYS; date = addDays(date, 1), i++) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
    const list = byDay.get(date) ?? [];
    const ins = list.filter((p) => p.type === 'IN');
    const outs = list.filter((p) => p.type === 'OUT');
    const firstIn = ins[0]?.at ?? null;
    const lastOutRaw = outs.length ? outs[outs.length - 1].at : null;
    const lastOut = firstIn && lastOutRaw && lastOutRaw > firstIn ? lastOutRaw : null;
    const missingOut = firstIn !== null && lastOut === null && date < today;
    const sched = schedule.get(weekday);
    let status: AttendanceDay['status'];
    let minutesLate = 0;
    if (holidays.has(date)) status = 'HOLIDAY';
    else if (!sched) status = firstIn ? 'PRESENT' : 'OFF';
    else if (firstIn) {
      const late = minutes(localParts(new Date(firstIn), tz).time) - minutes(sched.start);
      if (late > sched.grace) { status = 'LATE'; minutesLate = late; } else status = 'PRESENT';
    } else status = date < today ? 'ABSENT' : 'PENDING';
    const kind = status === 'LATE' ? 'LATE' : status === 'ABSENT' ? 'ABSENCE' : null;
    const justificationStatus = kind ? justs.get(`${date}|${kind}`) ?? null : null;
    days.push({ userId, workDate: date, status, minutesLate, firstIn, lastOut, missingOut, justificationStatus, justified: justificationStatus === 'ACCEPTED' });
  }
  return days;
}
