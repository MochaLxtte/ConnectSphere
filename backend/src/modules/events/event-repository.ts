import type { SaveEventDraftInput, EventRequestDetail } from './types.js';

export async function createEventRequestInDb(
  db: any,
  input: SaveEventDraftInput & { organiserId: string; status: 'DRAFT' | 'SUBMITTED' }
): Promise<EventRequestDetail> {
  const query = `
    INSERT INTO event_requests (
      organiser_id,
      status,
      name,
      purpose,
      description,
      starts_at,
      ends_at,
      expected_attendance,
      venue_requirements,
      accessibility_needs,
      equipment_requirements,
      registration_required
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING 
      id,
      organiser_id AS "organiserId",
      coordinator_id AS "coordinatorId",
      status,
      name,
      purpose,
      description,
      starts_at AS "startsAt",
      ends_at AS "endsAt",
      expected_attendance AS "expectedAttendance",
      venue_requirements AS "venueRequirements",
      accessibility_needs AS "accessibilityNeeds",
      equipment_requirements AS "equipmentRequirements",
      registration_required AS "registrationRequired",
      created_at AS "createdAt",
      updated_at AS "updatedAt";
  `;

  const values = [
    input.organiserId,
    input.status,
    input.name ?? null,
    input.purpose ?? null,
    input.description ?? null,
    input.startsAt ?? null,
    input.endsAt ?? null,
    input.expectedAttendance ?? null,
    input.venueRequirements ?? null,
    input.accessibilityNeeds ?? null,
    input.equipmentRequirements ?? null,
    input.registrationRequired ?? null,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}