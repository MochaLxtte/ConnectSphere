import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCatalogueVenue, fetchCatalogueVenues, updateCatalogueVenue } from './venue-catalogue';

const venue = { id: 'venue-a', name: 'Harbour Hall', capacity: 100 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('KAN-50 venue catalogue API client', () => {
  it('lists the catalogue from /api/venues/catalogue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [venue] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchCatalogueVenues()).toEqual([venue]);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/venues/catalogue');
  });

  it('reads one venue and encodes the id in the path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ venue }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchCatalogueVenue('a/b c')).toEqual(venue);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/venues/catalogue/a%2Fb%20c');
  });

  it('PATCHes only the supplied update and returns the saved venue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ venue: { ...venue, capacity: 90 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await updateCatalogueVenue('venue-a', { capacity: 90 })).toEqual({ ...venue, capacity: 90 });
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/venues/catalogue/venue-a');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ capacity: 90 });
  });

  it('surfaces the API error code and message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      json({ error: { code: 'INVALID_VENUE_CATALOGUE_INPUT', message: 'capacity must be a whole number.' } }, 400),
    ));
    await expect(updateCatalogueVenue('venue-a', { capacity: 0 })).rejects.toMatchObject({
      status: 400, code: 'INVALID_VENUE_CATALOGUE_INPUT', message: 'capacity must be a whole number.',
    });
  });
});
