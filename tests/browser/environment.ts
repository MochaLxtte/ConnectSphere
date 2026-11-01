/** Browser tests must never fall back to a developer's ordinary/shared DATABASE_URL. */
export function browserTestDatabaseUrl(value: string | undefined): string {
  const message = 'Set TEST_DATABASE_URL to an explicitly dedicated loopback PostgreSQL database whose name ends in _test.';
  if (!value?.trim()) throw new Error(message);
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error(message); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname)
    // pg accepts connection overrides in URL query parameters; do not let them bypass the host check.
    || [...url.searchParams.keys()].some((key) => !['sslmode'].includes(key))) {
    throw new Error(message);
  }
  return url.toString();
}

/** Set safe values before imports can load .env; keep external sign-in outside browser fixtures. */
export function browserApiEnvironment(databaseUrl: string, inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const environment = { ...inherited };
  for (const key of Object.keys(environment)) {
    if (/^(?:SUPABASE_|VITE_)/.test(key)) environment[key] = '';
  }
  return {
    ...environment,
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
    MIGRATION_DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: '4311',
    SUPABASE_URL: 'http://127.0.0.1:4311',
    SUPABASE_JWT_SECRET: 'isolated-browser-tests-do-not-authenticate-real-users',
    SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  };
}
