import type { Justification, Role } from '@kit-pulse/contracts';

export const REVIEW_ROLES: Role[] = ['ADMIN', 'HR'];
export function requiresRefusalConfirmation(status: 'ACCEPTED' | 'REJECTED'): boolean {
  return status === 'REJECTED';
}

export function pendingReviews(items: Justification[]): Justification[] {
  return items.filter((item) => item.status === 'PENDING');
}
