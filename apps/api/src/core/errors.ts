// GELE : Daniel.
export class HttpError extends Error {
  status: number; code: string; details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message); this.status = status; this.code = code; this.details = details;
  }
}
export const badRequest = (code: string, message: string, details?: unknown) => new HttpError(400, code, message, details);
export const forbidden = (message = 'Action non autorisee.') => new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Introuvable.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
