/** Validate configuration without including credentials in error messages. */
export function validateDatabaseUrl(value: string | undefined, name = 'DATABASE_URL'): string {
  const connectionString = value?.trim();
  if (!connectionString) {
    throw new Error(`${name} is required. Configure the PostgreSQL connection in .env.`);
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${name} must be a PostgreSQL connection string.`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${name} must be a PostgreSQL connection string, not a Supabase API URL.`);
  }

  const supabase = url.hostname.endsWith('.supabase.co')
    || url.hostname.endsWith('.supabase.com');
  if (supabase) {
    if (url.searchParams.get('sslmode') !== 'verify-full') {
      throw new Error(`${name} must use sslmode=verify-full for Supabase. See database/README.md.`);
    }
    if (url.port === '6543') {
      throw new Error(`${name} must use a direct connection or the session pooler on port 5432.`);
    }
  }
  return connectionString;
}
