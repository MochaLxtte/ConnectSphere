import assert from 'node:assert/strict';
import { test } from 'node:test';
import { browserApiEnvironment, browserTestDatabaseUrl } from './environment.js';

test('browser harness only accepts explicitly dedicated local test databases', () => {
  for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
    const url = `postgresql://test:test@${host}:55439/connectsphere_test`;
    assert.equal(browserTestDatabaseUrl(url), url);
  }
  for (const invalid of [undefined, '', 'not a URL', 'https://127.0.0.1/connectsphere_test',
    'postgresql://test:test@shared.supabase.co/connectsphere_test',
    'postgresql://test:test@127.0.0.1/connectsphere',
    'postgresql://test:test@127.0.0.1/connectsphere_test?host=shared.supabase.co',
    'postgresql://test:test@127.0.0.1/connectsphere_test?options=-c%20search_path=public',
    'postgresql://test:test@127.0.0.1/connectsphere_test?dbname=production']) {
    assert.throws(() => browserTestDatabaseUrl(invalid), /dedicated loopback PostgreSQL/);
  }
});

test('browser API replaces inherited production database and auth configuration before imports', () => {
  const url = 'postgresql://test:test@127.0.0.1:55439/connectsphere_test';
  const inherited = { DATABASE_URL: 'shared', TEST_DATABASE_URL: 'shared', MIGRATION_DATABASE_URL: 'shared',
    SUPABASE_URL: 'shared', SUPABASE_JWT_SECRET: 'shared', SUPABASE_SERVICE_ROLE_KEY: 'shared',
    VITE_SUPABASE_URL: 'shared', NODE_ENV: 'production', API_PORT: '3000', PATH: 'retain-path' };
  const environment = browserApiEnvironment(url, inherited);
  for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL', 'MIGRATION_DATABASE_URL']) {
    assert.equal(environment[key], url);
  }
  assert.equal(environment.SUPABASE_URL, 'http://127.0.0.1:4311');
  assert.notEqual(environment.SUPABASE_JWT_SECRET, 'shared');
  assert.equal(environment.SUPABASE_SERVICE_ROLE_KEY, '');
  assert.equal(environment.VITE_SUPABASE_URL, '');
  assert.equal(environment.NODE_ENV, 'test');
  assert.equal(environment.API_PORT, '4311');
  assert.equal(environment.PATH, 'retain-path');
  assert.equal(inherited.DATABASE_URL, 'shared');
});
