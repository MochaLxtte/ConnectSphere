import { describe, expect, it, vi } from 'vitest';
import {
  registerForEvent,
  type RegistrationActor,
  type RegistrationDependencies,
} from '../../src/modules/registrations/registration-service.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const attendee: RegistrationActor = { id: '20000000-0000-4000-8000-000000000001', role: 'ATTENDEE' };
const event = {
  id: eventId, organiserId: '20000000-0000-4000-8000-000000000002', name: 'Career fair', status: 'APPROVED',
  registrationRequired: true, startsAt: new Date('2026-10-01T00:00:00Z'), registrationCapacity: 1,
  registrationOpensAt: null, registrationClosesAt: null, now: new Date('2026-09-19T00:00:00Z'),
};

/** Scripted client: answers each statement by its leading keywords and records the order. */
function setup(onInsert: () => unknown, rollback: () => unknown = () => ({ rows: [] })) {
  const statements: string[] = [];
  const release = vi.fn();
  const client = {
    release,
    query: vi.fn(async (sql: string) => {
      const text = sql.trim().replace(/\s+/g, ' ');
      statements.push(text.split(' ').slice(0, 2).join(' '));
      if (text.startsWith('ROLLBACK')) return rollback();
      if (text.includes('FROM event_requests')) return { rows: [event] };
      if (text.includes('count(*)')) return { rows: [{ registered: 0 }] };
      if (text.startsWith('INSERT INTO event_registrations')) return onInsert();
      return { rows: [] };
    }),
  };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  return { dependencies: { pool } as unknown as RegistrationDependencies, statements, release };
}

describe('CF-18 register transaction', () => {
  it('maps the capacity trigger (23P01) to REGISTRATION_FULL after rolling back', async () => {
    const { dependencies, statements, release } = setup(() => {
      throw Object.assign(new Error('Event registration is full.'), {
        code: '23P01', constraint: 'event_registrations_within_capacity',
      });
    });
    await expect(registerForEvent(dependencies, attendee, eventId))
      .rejects.toMatchObject({ code: 'REGISTRATION_FULL', reason: 'FULL' });
    expect(statements[0]).toBe('BEGIN ISOLATION');
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(statements).not.toContain('COMMIT');
    expect(release).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('maps a unique violation to ALREADY_REGISTERED', async () => {
    const { dependencies } = setup(() => { throw Object.assign(new Error('duplicate'), { code: '23505' }); });
    await expect(registerForEvent(dependencies, attendee, eventId))
      .rejects.toMatchObject({ code: 'ALREADY_REGISTERED' });
  });

  it('does not reinterpret other exclusion violations or unknown failures', async () => {
    const other = Object.assign(new Error('other'), { code: '23P01', constraint: 'venue_bookings_no_overlap' });
    const { dependencies } = setup(() => { throw other; });
    await expect(registerForEvent(dependencies, attendee, eventId)).rejects.toBe(other);
  });

  it('discards the connection when rollback fails and never opens one for other roles', async () => {
    const failure = new Error('insert failed');
    const { dependencies, release } = setup(() => { throw failure; }, () => { throw new Error('rollback failed'); });
    await expect(registerForEvent(dependencies, attendee, eventId)).rejects.toBe(failure);
    expect(release.mock.calls[0]![0]).toBeInstanceOf(Error);

    const organiser = setup(() => ({ rows: [] }));
    await expect(registerForEvent(organiser.dependencies, { ...attendee, role: 'EVENT_ORGANISER' }, eventId))
      .rejects.toMatchObject({ code: 'REGISTRATION_FORBIDDEN' });
    expect(organiser.dependencies.pool.connect).not.toHaveBeenCalled();
  });

  it('commits the registration with both notifications', async () => {
    const { dependencies, statements } = setup(() => ({
      rows: [{ id: '30000000-0000-4000-8000-000000000001', status: 'REGISTERED', registeredAt: event.now, withdrawnAt: null }],
    }));
    await expect(registerForEvent(dependencies, attendee, eventId)).resolves.toMatchObject({ status: 'REGISTERED' });
    expect(statements.filter((statement) => statement === 'INSERT INTO')).toHaveLength(3);
    expect(statements.at(-1)).toBe('COMMIT');
  });
});
