// Dancile. SEULE porte d'entree pour les autres modules (reports). Signature gelee.
import type { AttendanceDay } from '@kit-pulse/contracts';
import type { Ctx } from '../../core/context.ts';
import { HttpError } from '../../core/errors.ts';
export function computeDays(_ctx: Ctx, _userId: number, _from: string, _to: string): AttendanceDay[] {
  throw new HttpError(501, 'NOT_IMPLEMENTED', 'A developper : ATT-001');
}
