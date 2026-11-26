export function isDevelopmentNotImplemented(status: number, isDevelopment: boolean): boolean {
  return isDevelopment && status === 501;
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}
