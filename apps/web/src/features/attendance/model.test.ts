import test from 'node:test';
import assert from 'node:assert/strict';
import type { AttendanceDay } from '@kit-pulse/contracts';
import { attendanceStatusLabel } from './model.ts';

const day = (status: AttendanceDay['status'], justified: boolean, justificationStatus: AttendanceDay['justificationStatus'] = null): AttendanceDay => ({ userId: 1, workDate: '2026-11-26', status, minutesLate: 11, firstIn: null, lastOut: null, missingOut: false, justificationStatus, justified, minutesEarly: 0, minutesAfter: 0, arrivalPending: false });
test('présences distinguent accepté, en attente, refusé et non justifié', () => {
  assert.match(attendanceStatusLabel(day('LATE', true, 'ACCEPTED')), /justifié/);
  assert.match(attendanceStatusLabel(day('LATE', false, 'PENDING')), /non justifié/);
  assert.match(attendanceStatusLabel(day('ABSENT', false, 'REJECTED')), /non justifié/);
  assert.match(attendanceStatusLabel(day('PRESENT', false)), /^Présent$/);
  assert.equal(Array.from({ length: 50 }, (_, i) => ({ ...day('LATE', i % 2 === 0), workDate: `2026-11-${String(i + 1).padStart(2, '0')}` })).length, 50);
});
