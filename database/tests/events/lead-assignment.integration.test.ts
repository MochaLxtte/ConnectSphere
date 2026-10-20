import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRuntimeApp } from '../../../backend/src/runtime-app.js';
import type { UserRole } from '../../../backend/src/modules/auth/types.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let fixture: WorkflowFixture;
const supabaseUrl = 'https://kan79-auth.example.test';
const secret = randomBytes(32).toString('hex');
const signingKey = new TextEncoder().encode(secret);
let app: ReturnType<typeof createRuntimeApp>;
beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', supabaseUrl);
  vi.stubEnv('SUPABASE_JWT_SECRET', secret);
  fixture = await createWorkflowFixture();
  app = createRuntimeApp({ pool: fixture.pool, isProduction: false });
});
afterAll(async () => {
  try { await fixture?.destroy(); } finally { vi.unstubAllEnvs(); }
});
async function token(uid: string, claims: Record<string, unknown> = {}) {
  return new SignJWT({ role: 'authenticated', ...claims }).setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`${supabaseUrl}/auth/v1`).setSubject(uid).setIssuedAt().setExpirationTime('1h').sign(signingKey);
}
async function profile(role: UserRole) {
  const actor = await fixture.createUser(role);
  const uid = randomUUID();
  await fixture.pool.query('UPDATE app_users SET supabase_user_id = $1, coordinator_available = $2 WHERE id = $3',
    [uid, role === 'EVENT_COORDINATOR', actor.id]);
  return { ...actor, uid };
}
async function login(actor: Awaited<ReturnType<typeof profile>>, claims: Record<string, unknown> = {}) {
  const session = request.agent(app);
  const result = await session.post('/api/auth/login').send({ accessToken: await token(actor.uid, claims) });
  expect(result.status).toBe(200);
  expect(result.body.user).toMatchObject({ id: actor.id, role: actor.role });
  return session;
}
async function state(id: string) {
  return {
    event: await fixture.eventRow(id),
    assignments: (await fixture.pool.query('SELECT * FROM coordinator_assignments WHERE event_request_id=$1 ORDER BY id', [id])).rows,
    reviews: (await fixture.pool.query('SELECT * FROM event_reviews WHERE event_request_id=$1', [id])).rows,
  };
}

describe('KAN-79 trusted runtime Lead sessions and request-specific authorisation', () => {
  it('accepts a provisioned Lead but never grants Lead from token claims, login fields, headers or an unmapped identity', async () => {
    const lead = await profile('EVENT_COORDINATOR_LEAD');
    const organiser = await profile('EVENT_ORGANISER');
    const coordinator = await profile('EVENT_COORDINATOR');
    const id = await fixture.createEvent({ organiserId: organiser.id });
    const leadSession = await login(lead);
    expect((await leadSession.get('/api/events/unassigned')).status).toBe(200);
    const impostor = await login(organiser, {
      role: 'EVENT_COORDINATOR_LEAD', app_metadata: { role: 'EVENT_COORDINATOR_LEAD' },
      user_metadata: { role: 'EVENT_COORDINATOR_LEAD', id: lead.id },
    });
    const before = await state(id);
    expect((await impostor.get('/api/events/oversight')).status).toBe(403);
    const denied = await impostor.put(`/api/events/${id}/coordinator`)
      .set('X-User-Role', 'EVENT_COORDINATOR_LEAD').set('X-User-Id', lead.id)
      .send({ coordinatorId: coordinator.id, role: 'EVENT_COORDINATOR_LEAD', assignedBy: lead.id });
    expect(denied.status).toBe(403);
    expect(await state(id)).toEqual(before);
    expect((await request(app).post('/api/auth/login').send({
      accessToken: await token(organiser.uid), role: 'EVENT_COORDINATOR_LEAD',
    })).status).toBe(400);
    const unmappedUid = randomUUID();
    const unmapped = await request(app).post('/api/auth/login').send({
      accessToken: await token(unmappedUid, { app_metadata: { role: 'EVENT_COORDINATOR_LEAD' } }),
    });
    expect(unmapped.status).toBe(403);
    expect(unmapped.body.error.code).toBe('ACCOUNT_NOT_PROVISIONED');
    expect((await fixture.pool.query('SELECT id FROM app_users WHERE supabase_user_id = $1', [unmappedUid])).rows).toEqual([]);
  });

  it('connects owner submission to both Leads, then grants only the chosen coordinator review access', async () => {
    const owner = await profile('EVENT_ORGANISER');
    const lead = await profile('EVENT_COORDINATOR_LEAD');
    const secondLead = await profile('EVENT_COORDINATOR_LEAD');
    const chosen = await profile('EVENT_COORDINATOR');
    const other = await profile('EVENT_COORDINATOR');
    const id = await fixture.createEvent({ organiserId: owner.id, status: 'DRAFT', name: 'Lead allocation workshop' });
    const ownerSession = await login(owner);
    const leadSession = await login(lead);
    const secondLeadSession = await login(secondLead);
    const chosenSession = await login(chosen);
    const otherSession = await login(other);
    expect((await ownerSession.post(`/api/events/${id}/submit`)).body).toMatchObject({ status: 'SUBMITTED', coordinatorId: null });
    for (const session of [leadSession, secondLeadSession]) {
      const queue = await session.get('/api/events/unassigned');
      expect(queue.status).toBe(200);
      expect(queue.headers['cache-control']).toBe('no-store');
      expect(queue.body.items).toContainEqual(expect.objectContaining({ id, name: 'Lead allocation workshop' }));
    }
    for (const session of [chosenSession, otherSession]) {
      expect((await session.get(`/api/events/${id}`)).status).toBe(404);
      expect((await session.get(`/api/events/${id}/assignments`)).status).toBe(404);
      expect((await session.put(`/api/events/${id}/coordinator`).send({ coordinatorId: chosen.id })).status).toBe(403);
    }
    const allocated = await leadSession.put(`/api/events/${id}/coordinator`).send({ coordinatorId: chosen.id });
    expect(allocated.status).toBe(200);
    expect(allocated.body).toMatchObject({ coordinatorId: chosen.id, previousCoordinatorId: null });
    expect((await leadSession.get('/api/events/unassigned')).body.items.map((item: { id: string }) => item.id)).not.toContain(id);
    expect((await leadSession.get('/api/events/oversight')).body.items).toContainEqual(expect.objectContaining({ id, coordinatorId: chosen.id }));
    const detail = await leadSession.get(`/api/events/oversight/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ id, status: 'SUBMITTED', coordinatorId: chosen.id, actions: { canAssignCoordinator: false } });
    expect(detail.body).not.toHaveProperty('review');
    expect(detail.body).not.toHaveProperty('organiserId');
    expect(detail.body).not.toHaveProperty('registrations');
    expect((await chosenSession.get(`/api/events/${id}`)).body.actions.canMakeInitialDecision).toBe(true);
    expect((await chosenSession.get('/api/events')).body.items).toContainEqual(expect.objectContaining({ id }));
    expect((await otherSession.get(`/api/events/${id}`)).status).toBe(404);
    expect((await otherSession.get('/api/events')).body.items.map((item: { id: string }) => item.id)).not.toContain(id);
    expect((await ownerSession.get(`/api/events/${id}`)).body.coordinatorId).toBe(chosen.id);
    const history = await ownerSession.get(`/api/events/${id}/assignments`);
    expect(history.body.items).toEqual([expect.objectContaining({ coordinatorId: chosen.id, assignedById: lead.id, assignmentMethod: 'MANUAL' })]);
    expect((await state(id)).reviews).toEqual([]);
    const committed = await state(id);
    const stale = await secondLeadSession.put(`/api/events/${id}/coordinator`).send({ coordinatorId: other.id });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('COORDINATOR_ALREADY_ASSIGNED');
    expect(await state(id)).toEqual(committed);
  });

  it('limits Lead supervision to active non-draft basic data and does not grant event or venue decision powers', async () => {
    const owner = await profile('EVENT_ORGANISER');
    const lead = await profile('EVENT_COORDINATOR_LEAD');
    const coordinator = await profile('EVENT_COORDINATOR');
    const session = await login(lead);
    const active = [];
    for (const status of ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'CONFIRMED'] as const) {
      active.push(await fixture.createEvent({ organiserId: owner.id, coordinatorId: coordinator.id, status }));
    }
    const excluded = [];
    for (const status of ['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const) {
      excluded.push(await fixture.createEvent({ organiserId: owner.id, status }));
    }
    const oversight = await session.get('/api/events/oversight');
    expect(oversight.status).toBe(200);
    const ids = oversight.body.items.map((item: { id: string }) => item.id);
    for (const id of active) expect(ids).toContain(id);
    for (const id of excluded) {
      expect(ids).not.toContain(id);
      expect((await session.get(`/api/events/oversight/${id}`)).status).toBe(404);
      expect((await session.get(`/api/events/${id}/assignments`)).status).toBe(404);
    }
    const id = active[0]!;
    const before = await state(id);
    expect((await session.get('/api/events')).status).toBe(403);
    expect((await session.get(`/api/events/${id}`)).status).toBe(403);
    expect((await session.post(`/api/events/${id}/reviews`).send({ decision: 'APPROVED' })).status).toBe(403);
    expect((await session.post(`/api/events/${id}/venue-bookings`).send({})).status).toBe(403);
    expect((await session.post(`/api/venue-bookings/${randomUUID()}/decision`).send({ decision: 'APPROVED' })).status).toBe(403);
    expect((await session.get(`/api/events/${id}/venue-suitability`)).status).toBe(403);
    expect((await session.get(`/api/events/${id}/clarifications`)).status).toBe(403);
    expect(await state(id)).toEqual(before);
    // Equipment decision and attendee-roster APIs are not implemented in this release;
    // their future role gates remain KAN-79 AC5 regression obligations, not claimed passes.
  });

  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'rejects %s at every protected Lead read and write entry point', async (role) => {
      const owner = await profile('EVENT_ORGANISER');
      const actor = await profile(role);
      const coordinator = await profile('EVENT_COORDINATOR');
      const id = await fixture.createEvent({ organiserId: owner.id });
      const session = await login(actor);
      for (const path of ['/api/events/unassigned', '/api/events/coordinators', '/api/events/oversight', `/api/events/oversight/${id}`]) {
        expect((await session.get(path)).status).toBe(403);
      }
      expect((await session.put(`/api/events/${id}/coordinator`).send({ coordinatorId: coordinator.id })).status).toBe(403);
      expect((await state(id)).assignments).toEqual([]);
    },
  );

  it('requires a real session and rechecks a revoked Lead role before reading or writing', async () => {
    const owner = await profile('EVENT_ORGANISER');
    const lead = await profile('EVENT_COORDINATOR_LEAD');
    const coordinator = await profile('EVENT_COORDINATOR');
    const id = await fixture.createEvent({ organiserId: owner.id });
    for (const path of ['/api/events/unassigned', '/api/events/coordinators', '/api/events/oversight', `/api/events/oversight/${id}`]) {
      expect((await request(app).get(path)).status).toBe(401);
    }
    expect((await request(app).put(`/api/events/${id}/coordinator`).send({ coordinatorId: coordinator.id })).status).toBe(401);
    const session = await login(lead);
    expect((await session.get('/api/events/unassigned')).status).toBe(200);
    await fixture.pool.query("UPDATE app_users SET role = 'EVENT_COORDINATOR' WHERE id = $1", [lead.id]);
    expect((await session.get('/api/events/unassigned')).status).toBe(403);
    expect((await session.put(`/api/events/${id}/coordinator`).send({ coordinatorId: coordinator.id })).status).toBe(403);
    expect((await state(id)).assignments).toEqual([]);
  });
});
