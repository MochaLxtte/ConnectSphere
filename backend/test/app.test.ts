import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { HealthDatabase } from '../src/db/pool.js';

function setup(rows = [{ key: 'scaffold_version', value: '1' }]) {
  const query = vi.fn<HealthDatabase['query']>().mockResolvedValue({ rows });
  const logger = { error: vi.fn() };
  const app = createApp({ database: { query }, logger });
  return { app, query, logger };
}

describe('scaffold HTTP endpoints', () => {
  it('reports process health without needing the database', async () => {
    const { app, query } = setup();
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'connectsphere-api' });
    expect(query).not.toHaveBeenCalled();
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('reports readiness when the scaffold migration is present', async () => {
    const { app, query } = setup();
    const response = await request(app).get('/api/health/ready');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    expect(query).toHaveBeenCalledWith('SELECT key, value FROM scaffold_metadata WHERE key = $1', [
      'scaffold_version',
    ]);
  });

  it('reports an unavailable database without revealing connection details', async () => {
    const { app, query } = setup();
    query.mockRejectedValue(new Error('postgresql://secret-user:secret-password@private-host/db'));
    const response = await request(app).get('/api/health/ready');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not ready. Run the migrations and check the database connection.',
      },
    });
    expect(response.text).not.toContain('secret');
  });

  it.each([{ rows: [] }, { rows: [{ key: 'scaffold_version', value: '0' }] }])(
    'reports not ready when scaffold metadata is missing or unsupported: %j',
    async ({ rows }) => {
      const { app } = setup(rows);
      const response = await request(app).get('/api/health/ready');
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
    },
  );

  it('returns a structured 400 for malformed JSON', async () => {
    const { app } = setup();
    const response = await request(app)
      .post('/api/events')
      .set('Content-Type', 'application/json')
      .send('{ broken json');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'The request body must contain valid JSON.' },
    });
  });

  it('limits JSON request bodies', async () => {
    const { app } = setup();
    const response = await request(app)
      .post('/api/events')
      .send({ name: 'x'.repeat(110_000) });
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it.each(['/unknown', '/api/events', '/api/auth/login'])(
    'returns structured 404 for an unimplemented endpoint: %s',
    async (path) => {
      const { app } = setup();
      const response = await request(app).get(path);
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
      });
    },
  );
});
