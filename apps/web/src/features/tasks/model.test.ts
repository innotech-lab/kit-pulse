import test from 'node:test';
import assert from 'node:assert/strict';
import type { Task } from '@kit-pulse/contracts';
import { canAssignTasks, canSubmitAssignment, isVisibleTask, statusForProgress } from './model.ts';

const task = (workDate: string, status: Task['status'] = 'TODO'): Task => ({ id: 1, title: 'x'.repeat(1600), description: null, assigneeId: 1, createdBy: 1, priority: 'NORMAL', status, progress: 0, workDate, dueDate: null });
test('tâches : liste vide, tâches en retard non terminées et liste de 50', () => {
  assert.equal([].filter((t) => isVisibleTask(t, '2026-11-26')).length, 0);
  assert.equal(isVisibleTask(task('2026-11-25'), '2026-11-26'), true);
  assert.equal(isVisibleTask(task('2026-11-25', 'DONE'), '2026-11-26'), false);
  assert.equal(Array.from({ length: 50 }, (_, i) => task(`2026-11-${String(1 + i % 25).padStart(2, '0')}`)).filter((t) => isVisibleTask(t, '2026-11-26')).length, 50);
  assert.equal(task('2026-11-26').title.length, 1600);
});
test('100 % termine, progression partielle active', () => {
  assert.equal(statusForProgress(100), 'DONE');
  assert.equal(statusForProgress(40), 'DOING');
  assert.equal(statusForProgress(0), 'TODO');
});
test('seuls les rôles DATA peuvent attribuer une tâche', () => {
  assert.equal(canAssignTasks('ADMIN'), true);
  assert.equal(canAssignTasks('HR'), true);
  assert.equal(canAssignTasks('COORDINATOR'), true);
  assert.equal(canAssignTasks('MEMBER'), false);
});
test('une disponibilité fictive ne peut pas être soumise comme destinataire réel', () => {
  assert.equal(canSubmitAssignment(7, 7, true), true);
  assert.equal(canSubmitAssignment(7, 8, true), false);
  assert.equal(canSubmitAssignment(7, 8, false), true);
});
