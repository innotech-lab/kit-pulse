import type { Availability, AvailabilityStatus } from '@kit-pulse/contracts';

export const AVAILABILITY_STATUSES: AvailabilityStatus[] = ['FREE', 'BUSY', 'MEETING', 'FIELD', 'OFFLINE'];

export function filterAvailability(rows: Availability[], name: string, status: AvailabilityStatus | 'ALL'): Availability[] {
  const query = name.trim().toLocaleLowerCase();
  return rows.filter((row) => row.fullName.toLocaleLowerCase().includes(query) && (status === 'ALL' || row.status === status));
}
