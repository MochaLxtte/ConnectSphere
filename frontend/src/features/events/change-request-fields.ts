import type { SignificantField } from './api/change-requests';
import { formatEventTime } from './presentation';

/** KAN-15: labels and display for significant fields, shared by the request page and panel. */
export const changeFieldConfig: Record<SignificantField, {
  label: string; kind: 'textarea' | 'datetime' | 'count' | 'choice'; required?: boolean; registration?: boolean;
}> = {
  purpose: { label: 'Purpose', kind: 'textarea', required: true },
  startsAt: { label: 'Starts', kind: 'datetime', required: true },
  endsAt: { label: 'Ends', kind: 'datetime', required: true },
  expectedAttendance: { label: 'Expected attendance', kind: 'count', required: true },
  venueRequirements: { label: 'Venue requirements', kind: 'textarea', required: true },
  accessibilityNeeds: { label: 'Accessibility needs', kind: 'textarea' },
  equipmentRequirements: { label: 'Equipment requirements', kind: 'textarea' },
  registrationRequired: { label: 'Registration required', kind: 'choice' },
  registrationCapacity: { label: 'Registration capacity', kind: 'count', registration: true },
  registrationOpensAt: { label: 'Registration opens', kind: 'datetime', registration: true },
  registrationClosesAt: { label: 'Registration closes', kind: 'datetime', registration: true },
};

export const changeFieldOrder = Object.keys(changeFieldConfig) as SignificantField[];

export function formatChangeValue(field: SignificantField, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  const { kind } = changeFieldConfig[field];
  if (kind === 'datetime') return formatEventTime(String(value));
  if (kind === 'choice') return value === true ? 'Yes' : 'No';
  return String(value);
}

/** Proposed fields in the standard order, ignoring any the server did not send. */
export function changedFields(values: Partial<Record<SignificantField, unknown>>): SignificantField[] {
  return changeFieldOrder.filter((field) => field in values);
}
