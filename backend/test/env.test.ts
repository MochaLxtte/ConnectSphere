import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../src/config/env.js';

describe('server configuration', () => {
  it('uses the documented local defaults', () => {
    expect(parseEnvironment({ DATABASE_URL: 'postgresql://localhost/connectsphere' })).toEqual({
      databaseUrl: 'postgresql://localhost/connectsphere',
      apiPort: 3000,
      apiHost: '127.0.0.1',
      nodeEnv: 'development',
    });
  });

  it('requires a database connection string before startup', () => {
    expect(() => parseEnvironment({})).toThrow('DATABASE_URL is required');
  });

  it.each(['', 'abc', '3000.5', '0', '65536', '-1'])(
    'rejects an invalid API_PORT: %s',
    (apiPort) => {
      expect(() =>
        parseEnvironment({ DATABASE_URL: 'postgresql://localhost/db', API_PORT: apiPort }),
      ).toThrow('API_PORT');
    },
  );

  it('rejects unknown environments', () => {
    expect(() =>
      parseEnvironment({ DATABASE_URL: 'postgresql://localhost/db', NODE_ENV: 'unknown' }),
    ).toThrow('NODE_ENV');
  });
});
