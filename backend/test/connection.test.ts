import { describe, expect, it } from 'vitest';
import { validateDatabaseUrl } from '../src/db/connection.js';

const hosted = 'postgresql://postgres.example:fictional-password@aws-0-example.pooler.supabase.com:5432/postgres';

describe('PostgreSQL connection configuration', () => {
  it('accepts local PostgreSQL used by isolated tests', () => {
    expect(validateDatabaseUrl(' postgres://localhost/connectsphere '))
      .toBe('postgres://localhost/connectsphere');
  });

  it('accepts a Supabase session pooler with verified TLS and an encoded CA path', () => {
    const url = `${hosted}?sslmode=verify-full&sslrootcert=C%3A%2Fcerts%2Fdatabase-ca.crt`;
    expect(validateDatabaseUrl(url)).toBe(url);
  });

  it('accepts a verified direct connection', () => {
    const url = 'postgresql://postgres:fictional-password@db.example.supabase.co:5432/postgres?sslmode=verify-full';
    expect(validateDatabaseUrl(url)).toBe(url);
  });

  it.each(['', '?sslmode=disable', '?sslmode=no-verify', '?sslmode=require'])(
    'rejects a Supabase connection without explicit certificate verification: %s',
    (ssl) => {
      expect(() => validateDatabaseUrl(hosted + ssl)).toThrow('sslmode=verify-full');
    },
  );

  it('rejects the transaction pooler for this scaffold', () => {
    expect(() => validateDatabaseUrl(hosted.replace(':5432/', ':6543/') + '?sslmode=verify-full'))
      .toThrow('session pooler');
  });

  it.each([undefined, '', '   '])('rejects a missing connection without leaking values', (value) => {
    expect(() => validateDatabaseUrl(value)).toThrow('DATABASE_URL is required');
  });

  it.each(['not a connection', 'https://example.supabase.co', 'ftp://postgres/secret'])(
    'rejects invalid protocols without exposing the input', (value) => {
      expect(() => validateDatabaseUrl(value)).toThrow('PostgreSQL connection string');
      try { validateDatabaseUrl(value); } catch (error) {
        expect((error as Error).message).not.toContain(value);
      }
    },
  );

  it('identifies invalid migration settings without exposing credentials', () => {
    expect(() => validateDatabaseUrl(hosted, 'MIGRATION_DATABASE_URL'))
      .toThrow('MIGRATION_DATABASE_URL must use sslmode=verify-full');
    try { validateDatabaseUrl(hosted); } catch (error) {
      expect((error as Error).message).not.toContain('fictional-password');
    }
  });
});
