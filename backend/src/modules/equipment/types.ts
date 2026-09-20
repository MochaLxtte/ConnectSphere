import type { Request } from 'express';
import type { Pool } from 'pg';
import type { UserRole } from '../auth/types.js';

/** Verified application identity; never built from request bodies or headers. */
export interface EquipmentActor {
  id: string;
  role: UserRole;
}

export interface EquipmentDependencies {
  pool: Pick<Pool, 'query' | 'connect'>;
  /** Return null for absent/invalid credentials; throw for verification service failures. */
  authenticate(request: Request): Promise<EquipmentActor | null>;
}

export const EQUIPMENT_REQUEST_STATUSES = ['REQUESTED', 'RESERVED', 'REJECTED', 'CANCELLED'] as const;
export type EquipmentRequestStatus = (typeof EQUIPMENT_REQUEST_STATUSES)[number];

/** CF-15/Q-09 (provisional): equipment is pooled by type with one total quantity. */
export interface EquipmentType {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  totalQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** CF-16: quantities for one half-open period [from, to). */
export interface EquipmentAvailability {
  equipmentTypeId: string;
  from: string;
  to: string;
  totalQuantity: number;
  /** Highest simultaneous RESERVED quantity at any instant of the period. */
  reservedPeak: number;
  available: number;
}

export interface EquipmentAvailabilityItem extends EquipmentAvailability {
  name: string;
  category: string | null;
}

export interface EquipmentRequestRecord {
  id: string;
  eventRequestId: string;
  equipmentTypeId: string;
  equipmentName: string;
  equipmentCategory: string | null;
  requestedBy: string;
  quantity: number;
  status: EquipmentRequestStatus;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** CF-17 queue row: the request plus what Technical Support needs to decide it. */
export interface EquipmentRequestQueueItem extends EquipmentRequestRecord {
  eventName: string | null;
  organiserName: string;
  requesterName: string;
  totalQuantity: number;
  reservedPeak: number;
  /** Pool quantity still free for this request's period, excluding this request itself. */
  available: number;
}
