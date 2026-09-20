import type { Pool, PoolClient } from 'pg';
import { computeReservedPeak } from './availability.js';
import type {
  EquipmentListFilter, EquipmentTypeInput, EquipmentTypeUpdateInput,
} from './equipment-input.js';
import { EquipmentConflictError, EquipmentForbiddenError, EquipmentNotFoundError } from './errors.js';
import { isDatabaseError, withTransaction } from './transaction.js';
import type { EquipmentActor, EquipmentType } from './types.js';

type Queryable = Pick<Pool | PoolClient, 'query'>;

interface EquipmentTypeRow extends Omit<EquipmentType, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

const columns = `
  id, name, category, description, total_quantity AS "totalQuantity", is_active AS "isActive",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

function toEquipmentType(row: EquipmentTypeRow): EquipmentType {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export function canManageEquipment(actor: EquipmentActor): boolean {
  return actor.role === 'TECHNICAL_SUPPORT_STAFF';
}

function assertCanManage(actor: EquipmentActor): void {
  if (!canManageEquipment(actor)) {
    throw new EquipmentForbiddenError(
      'EQUIPMENT_FORBIDDEN', 'Only technical support staff can manage equipment types.',
    );
  }
}

function nameTaken(error: unknown): EquipmentConflictError | null {
  return isDatabaseError(error, '23505', 'equipment_types_name_unique')
    ? new EquipmentConflictError('EQUIPMENT_NAME_TAKEN', 'Another equipment type already uses this name.')
    : null;
}

/** Every signed-in role may browse active types; inactive ones are for Technical Support only. */
export async function listEquipmentTypes(
  database: Queryable, actor: EquipmentActor, filter: EquipmentListFilter,
): Promise<EquipmentType[]> {
  const result = await database.query<EquipmentTypeRow>(`
    SELECT ${columns} FROM equipment_types
    WHERE ($1::boolean OR is_active)
      AND ($2::text IS NULL
        OR position(lower($2) in lower(name)) > 0
        OR position(lower($2) in lower(coalesce(description, ''))) > 0
        OR position(lower($2) in lower(coalesce(category, ''))) > 0)
      AND ($3::text IS NULL OR lower(category) = lower($3))
    ORDER BY lower(name), id
  `, [canManageEquipment(actor), filter.q, filter.category]);
  return result.rows.map(toEquipmentType);
}

export async function getEquipmentType(
  database: Queryable, actor: EquipmentActor, id: string,
): Promise<EquipmentType> {
  const result = await database.query<EquipmentTypeRow>(
    `SELECT ${columns} FROM equipment_types WHERE id = $1`, [id],
  );
  const row = result.rows[0];
  // An inactive type looks missing to everyone except the staff who maintain the catalogue.
  if (!row || (!row.isActive && !canManageEquipment(actor))) {
    throw new EquipmentNotFoundError('EQUIPMENT_NOT_FOUND');
  }
  return toEquipmentType(row);
}

export async function createEquipmentType(
  database: Queryable, actor: EquipmentActor, input: EquipmentTypeInput,
): Promise<EquipmentType> {
  assertCanManage(actor);
  try {
    const result = await database.query<EquipmentTypeRow>(`
      INSERT INTO equipment_types (name, category, description, total_quantity, is_active)
      VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}
    `, [input.name, input.category, input.description, input.totalQuantity, input.isActive]);
    const row = result.rows[0];
    if (!row) throw new Error('The equipment type could not be created.');
    return toEquipmentType(row);
  } catch (error) {
    throw nameTaken(error) ?? error;
  }
}

/**
 * Locks the type row, which the overbooking trigger also locks, so a quantity reduction and a
 * competing reservation cannot both succeed against the old pool size.
 */
export async function updateEquipmentType(
  pool: Pick<Pool, 'connect'>, actor: EquipmentActor, id: string, input: EquipmentTypeUpdateInput,
): Promise<EquipmentType> {
  assertCanManage(actor);
  try {
    return await withTransaction(pool, async (client) => {
      const locked = await client.query<{ totalQuantity: number }>(
        'SELECT total_quantity AS "totalQuantity" FROM equipment_types WHERE id = $1 FOR UPDATE', [id],
      );
      const current = locked.rows[0];
      if (!current) throw new EquipmentNotFoundError('EQUIPMENT_NOT_FOUND');

      if (input.totalQuantity !== undefined && input.totalQuantity < current.totalQuantity) {
        const reserved = await client.query<{ startsAt: Date; endsAt: Date; quantity: number; now: Date }>(`
          SELECT starts_at AS "startsAt", ends_at AS "endsAt", quantity, now() AS now
          FROM equipment_requests
          WHERE equipment_type_id = $1 AND status = 'RESERVED' AND ends_at > now()
        `, [id]);
        const first = reserved.rows[0];
        if (first) {
          const horizon = Math.max(...reserved.rows.map((row) => row.endsAt.getTime()));
          const peak = computeReservedPeak(reserved.rows, first.now, horizon);
          if (input.totalQuantity < peak) {
            throw new EquipmentConflictError(
              'EQUIPMENT_QUANTITY_IN_USE',
              `Current and upcoming reservations need ${peak} at once, so the total cannot go below ${peak}.`,
              { reservedPeak: peak },
            );
          }
        }
      }

      const updated = await client.query<EquipmentTypeRow>(`
        UPDATE equipment_types SET
          name = CASE WHEN $2::boolean THEN $3 ELSE name END,
          category = CASE WHEN $4::boolean THEN $5 ELSE category END,
          description = CASE WHEN $6::boolean THEN $7 ELSE description END,
          total_quantity = CASE WHEN $8::boolean THEN $9::integer ELSE total_quantity END,
          is_active = CASE WHEN $10::boolean THEN $11::boolean ELSE is_active END,
          updated_at = now()
        WHERE id = $1 RETURNING ${columns}
      `, [
        id,
        input.name !== undefined, input.name ?? null,
        input.category !== undefined, input.category ?? null,
        input.description !== undefined, input.description ?? null,
        input.totalQuantity !== undefined, input.totalQuantity ?? null,
        input.isActive !== undefined, input.isActive ?? null,
      ]);
      const row = updated.rows[0];
      if (!row) throw new Error('The equipment type could not be updated.');
      return toEquipmentType(row);
    });
  } catch (error) {
    throw nameTaken(error) ?? error;
  }
}
