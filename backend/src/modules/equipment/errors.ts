/** 400: the body, query or route parameter does not match the contract. */
export class EquipmentInputError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_EQUIPMENT_INPUT'
      | 'INVALID_EQUIPMENT_ID'
      | 'INVALID_AVAILABILITY_WINDOW'
      | 'INVALID_EQUIPMENT_LIST_FILTER'
      | 'INVALID_EQUIPMENT_REQUEST_INPUT'
      | 'INVALID_EQUIPMENT_REQUEST_ID'
      | 'INVALID_EQUIPMENT_REQUEST_FILTER'
      | 'INVALID_EQUIPMENT_DECISION_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'EquipmentInputError';
  }
}

/** 403: the verified role or relationship does not permit this action. */
export class EquipmentForbiddenError extends Error {
  constructor(
    public readonly code: 'EQUIPMENT_FORBIDDEN' | 'EQUIPMENT_REQUEST_FORBIDDEN',
    message: string,
  ) {
    super(message);
    this.name = 'EquipmentForbiddenError';
  }
}

/** 404: missing, or hidden from a caller unrelated to the record (same response for both). */
export class EquipmentNotFoundError extends Error {
  constructor(
    public readonly code: 'EQUIPMENT_NOT_FOUND' | 'EQUIPMENT_REQUEST_NOT_FOUND' | 'EVENT_REQUEST_NOT_FOUND',
  ) {
    super({
      EQUIPMENT_NOT_FOUND: 'The equipment type was not found.',
      EQUIPMENT_REQUEST_NOT_FOUND: 'The equipment request was not found.',
      EVENT_REQUEST_NOT_FOUND: 'The event request was not found.',
    }[code]);
    this.name = 'EquipmentNotFoundError';
  }
}

export type EquipmentConflictCode =
  | 'EQUIPMENT_NAME_TAKEN'
  | 'EQUIPMENT_QUANTITY_IN_USE'
  | 'EQUIPMENT_QUANTITY_EXCEEDS_POOL'
  | 'EQUIPMENT_TYPE_INACTIVE'
  | 'EVENT_NOT_ELIGIBLE_FOR_EQUIPMENT'
  | 'EVENT_SCHEDULE_REQUIRED'
  | 'EQUIPMENT_REQUEST_NOT_PENDING'
  | 'EQUIPMENT_REQUEST_NOT_CANCELLABLE'
  | 'EQUIPMENT_UNAVAILABLE';

/** 409: the authorised action conflicts with the current stored state. */
export class EquipmentConflictError extends Error {
  constructor(
    public readonly code: EquipmentConflictCode,
    message: string,
    /** Extra public fields merged into the error envelope, for example `available`. */
    public readonly details: Record<string, number> = {},
  ) {
    super(message);
    this.name = 'EquipmentConflictError';
  }
}
