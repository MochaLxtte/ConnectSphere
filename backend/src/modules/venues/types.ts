import type { Request } from 'express';
import type { Pool } from 'pg';
import type { UserRole } from '../auth/types.js';

/** Verified application identity; never built from request bodies or headers. */
export interface VenueActor {
  id: string;
  role: UserRole;
}

export interface VenuesRouterDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
  /** Return null for absent/invalid credentials; throw for verification service failures. */
  authenticate(request: Request): Promise<VenueActor | null>;
}

/** CF-08 catalogue record. Operating hours are "HH:MM" in Asia/Singapore; null means unrestricted. */
export interface VenueRecord {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibilityFeatures: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const VENUE_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type VenueBookingStatus = (typeof VENUE_BOOKING_STATUSES)[number];

/** Half-open interval [startsAt, endsAt) as ISO 8601 strings. */
export interface Interval {
  startsAt: string;
  endsAt: string;
}

export type SuitabilityCheckCode =
  | 'ACTIVE' | 'CAPACITY' | 'ACCESSIBILITY' | 'OPERATING_HOURS' | 'AVAILABILITY';

export interface SuitabilityCheck {
  code: SuitabilityCheckCode;
  passed: boolean;
  message: string;
}

export interface SuitabilityResult {
  suitable: boolean;
  checks: SuitabilityCheck[];
}

export interface VenueBookingRecord extends Interval {
  id: string;
  eventRequestId: string;
  venueId: string;
  venueName: string;
  requestedBy: string;
  status: VenueBookingStatus;
  layout: string | null;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingConflict extends Interval {
  bookingId: string;
  status: 'PENDING' | 'APPROVED';
  eventName: string | null;
}

/** CF-13/CF-14: what VENUE_STAFF see before deciding. */
export interface VenueBookingQueueItem extends VenueBookingRecord {
  eventName: string | null;
  organiserName: string;
  expectedAttendance: number | null;
  suitability: SuitabilityResult;
  conflicts: BookingConflict[];
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
