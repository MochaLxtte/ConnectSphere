import { MAX_TEXT_LENGTH, WorkflowError } from '../events/workflow-support.js';

export type EquipmentReservationAction = 'reserve' | 'cancel';

export function invalidReservation(message: string): WorkflowError {
  return new WorkflowError('INVALID_INPUT', 'INVALID_EQUIPMENT_RESERVATION_INPUT', message);
}

export function parseEquipmentReservationInput(input: unknown, action: EquipmentReservationAction): {
  requirementsVersion: string; reason: string | null;
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw invalidReservation('The reservation input must be an object.');
  }
  const body = input as Record<string, unknown>;
  const allowed = action === 'cancel' ? ['requirementsVersion', 'reason'] : ['requirementsVersion'];
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw invalidReservation('The reservation input contains unsupported fields.');
  }
  if (typeof body.requirementsVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.requirementsVersion)) {
    throw invalidReservation('requirementsVersion must match the current equipment context.');
  }
  let reason: string | null = null;
  if (action === 'cancel') {
    if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > MAX_TEXT_LENGTH) {
      throw invalidReservation(`Cancellation requires a nonempty reason of at most ${MAX_TEXT_LENGTH} characters.`);
    }
    reason = body.reason.trim();
  }
  return { requirementsVersion: body.requirementsVersion, reason };
}
