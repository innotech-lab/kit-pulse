import type { Role, Task, TaskStatus } from '@kit-pulse/contracts';

export const TASK_ASSIGNMENT_ROLES: Role[] = ['ADMIN', 'HR', 'COORDINATOR'];
export function canAssignTasks(role: Role): boolean {
  return TASK_ASSIGNMENT_ROLES.includes(role);
}
export function canSubmitAssignment(currentUserId: number, assigneeId: number, availabilityIsDemo: boolean): boolean {
  return !availabilityIsDemo || currentUserId === assigneeId;
}

export function isVisibleTask(task: Task, date: string): boolean {
  return task.workDate === date || (task.workDate < date && task.status !== 'DONE' && task.status !== 'CANCELLED');
}
export function statusForProgress(progress: number): TaskStatus {
  return progress === 100 ? 'DONE' : progress > 0 ? 'DOING' : 'TODO';
}
