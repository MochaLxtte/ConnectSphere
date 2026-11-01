import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import * as search from '../../src/modules/venues/venue-search.js';
import { WorkflowError, type WorkflowActor } from '../../src/modules/events/workflow-support.js';

// Retain actual input validation; substitute only the database-dependent reads.
vi.mock('../../src/modules/venues/venue-search.js', async original => ({
  ...await original<typeof search>(), listVenueFilterOptions: vi.fn(), searchVenues: vi.fn(),
}));
const actor: WorkflowActor = { id: '12000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const authenticate = vi.fn<() => Promise<WorkflowActor | null>>();
const workspace = { pool: {} as Pool, authenticate };
const app = createApp({ database: { query: vi.fn() }, workspace, logger: { error: vi.fn() } });
const endpoints = ['/api/venues/filter-options', '/api/venues/search-venues'];
beforeEach(() => { vi.resetAllMocks(); authenticate.mockResolvedValue(actor); });

describe('KAN-12 venue search HTTP boundary', () => {
  it('requires authentication for both catalogue options and search results', async () => {
    authenticate.mockResolvedValue(null);
    for (const path of endpoints) expect((await request(app).get(path)).status).toBe(401);
    expect(search.listVenueFilterOptions).not.toHaveBeenCalled();
    expect(search.searchVenues).not.toHaveBeenCalled();
  });
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE', 'SAFETY_OFFICER'] as const)(
    'refuses %s and forged coordinator headers before reading the catalogue', async role => {
      authenticate.mockResolvedValue({ ...actor, role });
      for (const path of endpoints) expect((await request(app).get(path).set('X-Role', 'EVENT_COORDINATOR')).status).toBe(403);
      expect(search.listVenueFilterOptions).not.toHaveBeenCalled();
      expect(search.searchVenues).not.toHaveBeenCalled();
    });
  it('returns live filter options with the verified actor and no-cache policy', async () => {
    const options = { layouts: ['THEATRE'], facilities: ['PROJECTOR'], accessibility: ['STEP_FREE_ACCESS'] };
    vi.mocked(search.listVenueFilterOptions).mockResolvedValue(options);
    const response = await request(app).get(endpoints[0]!);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(options);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(search.listVenueFilterOptions).toHaveBeenCalledWith(workspace, actor);
  });
  it('parses the requested filters and returns the service results for the authenticated coordinator', async () => {
    vi.mocked(search.searchVenues).mockResolvedValue([{ id: 'venue-1', name: 'Hall' }] as never);
    const response = await request(app).get(endpoints[1]!).query({ attendance: '20', location: ' Hall ', layout: 'THEATRE' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ id: 'venue-1', name: 'Hall' }] });
    expect(search.searchVenues).toHaveBeenCalledWith(workspace, actor,
      expect.objectContaining({ attendance: 20, location: 'Hall', layout: 'THEATRE' }));
  });
  it.each([
    'location=Hall&location=Roof', `location=${'x'.repeat(101)}`,
    `facilities=${'x'.repeat(101)}`, Array.from({ length: 31 }, (_, i) => `facilities=F${i}`).join('&'),
  ])('refuses malformed or excessive filter input before searching (%s)', async query => {
    const response = await request(app).get(`${endpoints[1]}?${query}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_VENUE_SEARCH');
    expect(search.searchVenues).not.toHaveBeenCalled();
  });
  it('maps catalogue service failure without disclosing internal error details', async () => {
    vi.mocked(search.listVenueFilterOptions).mockRejectedValue(new Error('private SQL query'));
    const response = await request(app).get(endpoints[0]!);
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.text).not.toContain('private SQL');
  });
  it('preserves a service authorization refusal after the route initially permitted the role', async () => {
    vi.mocked(search.searchVenues).mockRejectedValue(new WorkflowError('FORBIDDEN', 'VENUE_SEARCH_FORBIDDEN', 'Role changed.'));
    expect((await request(app).get(endpoints[1]!)).status).toBe(403);
  });
});

describe('KAN-12 filter parser boundaries', () => {
  it.each([{ facilities: [42] }, { accessibility: { unexpected: 'object' } }, { layout: ['THEATRE'] }])(
    'refuses non-text scalar/list shapes (%j)', query => {
      expect(() => search.parseVenueSearchQuery(query)).toThrow(WorkflowError);
    });
  it('accepts exact text/list limits and deduplicates repeated choices before counting', () => {
    const facilities = Array.from({ length: 30 }, (_, i) => `F${i}`);
    expect(search.parseVenueSearchQuery({ location: 'x'.repeat(100), facilities: [...facilities, facilities[0]] }))
      .toMatchObject({ location: 'x'.repeat(100), facilities });
  });
});
