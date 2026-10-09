import type { CatalogueVenue, CatalogueVenueUpdate } from './api/venue-catalogue';

/** Text-box form state for one venue; the backend remains the authority on every rule. */
export interface CatalogueFormValues {
  location: string;
  capacity: string;
  facilities: string; // one label per line
  accessibilityFeatures: string;
  wheelchairAccessible: boolean;
  layouts: string;
  opensAt: string; // "HH:MM" or ""
  closesAt: string;
}

export type CatalogueFormErrors = Partial<Record<keyof CatalogueFormValues, string>>;

export const MAX_CAPACITY = 2_147_483_647;
export const MAX_LOCATION_LENGTH = 200;
export const MAX_LABEL_LENGTH = 100;
export const MAX_LABELS = 30;

const joinLines = (labels: string[]) => labels.join('\n');

export function toFormValues(venue: CatalogueVenue): CatalogueFormValues {
  return {
    location: venue.location ?? '',
    capacity: String(venue.capacity),
    facilities: joinLines(venue.facilities),
    accessibilityFeatures: joinLines(venue.accessibilityFeatures),
    wheelchairAccessible: venue.wheelchairAccessible,
    layouts: joinLines(venue.layouts),
    opensAt: venue.opensAt ?? '',
    closesAt: venue.closesAt ?? '',
  };
}

/** One label per line: trimmed, blanks dropped, duplicates (ignoring case) keep their first spelling. */
export function parseLabelLines(text: string): string[] {
  const unique = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const label = line.trim();
    if (label && !unique.has(label.toLowerCase())) unique.set(label.toLowerCase(), label);
  }
  return [...unique.values()];
}

function labelError(text: string, noun: string): string | undefined {
  const labels = parseLabelLines(text);
  if (labels.length > MAX_LABELS) return `Enter at most ${MAX_LABELS} ${noun}.`;
  if (labels.some((label) => label.length > MAX_LABEL_LENGTH)) {
    return `Each entry must be at most ${MAX_LABEL_LENGTH} characters.`;
  }
  return undefined;
}

export function validateForm(values: CatalogueFormValues): CatalogueFormErrors {
  const errors: CatalogueFormErrors = {};
  const capacity = values.capacity.trim();
  if (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > MAX_CAPACITY) {
    errors.capacity = `Enter a whole number from 1 to ${MAX_CAPACITY}.`;
  }
  if (values.location.trim().length > MAX_LOCATION_LENGTH) {
    errors.location = `Location must be at most ${MAX_LOCATION_LENGTH} characters.`;
  }
  errors.facilities = labelError(values.facilities, 'facilities');
  errors.accessibilityFeatures = labelError(values.accessibilityFeatures, 'accessibility features');
  errors.layouts = labelError(values.layouts, 'layouts');
  if (values.opensAt && values.closesAt && values.closesAt <= values.opensAt) {
    errors.closesAt = 'Closing time must be after opening time.';
  }
  for (const key of Object.keys(errors) as (keyof CatalogueFormValues)[]) {
    if (errors[key] === undefined) delete errors[key];
  }
  return errors;
}

const sameList = (left: string[], right: string[]) =>
  left.length === right.length && left.every((label, index) => label === right[index]);

/**
 * Only the fields that differ from the saved venue, so staff editing different fields of one
 * venue cannot overwrite each other. An empty object means there is nothing to save.
 */
export function buildUpdate(venue: CatalogueVenue, values: CatalogueFormValues): CatalogueVenueUpdate {
  const update: CatalogueVenueUpdate = {};
  const location = values.location.trim() || null;
  if (location !== venue.location) update.location = location;
  const capacity = Number(values.capacity.trim());
  if (capacity !== venue.capacity) update.capacity = capacity;
  const facilities = parseLabelLines(values.facilities);
  if (!sameList(facilities, venue.facilities)) update.facilities = facilities;
  const accessibilityFeatures = parseLabelLines(values.accessibilityFeatures);
  if (!sameList(accessibilityFeatures, venue.accessibilityFeatures)) update.accessibilityFeatures = accessibilityFeatures;
  if (values.wheelchairAccessible !== venue.wheelchairAccessible) {
    update.wheelchairAccessible = values.wheelchairAccessible;
  }
  const layouts = parseLabelLines(values.layouts);
  if (!sameList(layouts, venue.layouts)) update.layouts = layouts;
  const opensAt = values.opensAt || null;
  if (opensAt !== venue.opensAt) update.opensAt = opensAt;
  const closesAt = values.closesAt || null;
  if (closesAt !== venue.closesAt) update.closesAt = closesAt;
  return update;
}
