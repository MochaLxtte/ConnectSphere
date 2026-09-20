export type VenueRuleKind = 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID';

/**
 * A business-rule outcome the HTTP layer maps to 404 / 403 / 409 / 400. `details` is merged into
 * the error envelope (for example the conflicting intervals of a refused approval).
 */
export class VenueRuleError extends Error {
  constructor(
    readonly kind: VenueRuleKind,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'VenueRuleError';
  }
}

export const venueNotFound = () =>
  new VenueRuleError('NOT_FOUND', 'VENUE_NOT_FOUND', 'The venue was not found.');
export const eventNotFound = () =>
  new VenueRuleError('NOT_FOUND', 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.');
export const bookingNotFound = () =>
  new VenueRuleError('NOT_FOUND', 'VENUE_BOOKING_NOT_FOUND', 'The venue booking was not found.');

/** PostgreSQL error fields used to recognise constraint and trigger violations. */
export function databaseErrorInfo(error: unknown): { code?: string; constraint?: string } {
  if (typeof error !== 'object' || error === null) return {};
  const { code, constraint } = error as { code?: unknown; constraint?: unknown };
  return {
    ...(typeof code === 'string' ? { code } : {}),
    ...(typeof constraint === 'string' ? { constraint } : {}),
  };
}
