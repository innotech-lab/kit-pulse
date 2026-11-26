import type { AttendanceDay } from '@kit-pulse/contracts';

export function attendanceStatusLabel(day: AttendanceDay): string {
  const status: Record<AttendanceDay['status'], string> = { PRESENT: 'Présent', LATE: 'En retard', ABSENT: 'Absent', HOLIDAY: 'Jour férié', OFF: 'Jour non travaillé', PENDING: 'En attente de pointage' };
  return `${status[day.status]}${day.justified ? ' — justifié' : day.status === 'LATE' || day.status === 'ABSENT' ? ' — non justifié' : ''}`;
}
