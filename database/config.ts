import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { validateDatabaseUrl } from '../backend/src/db/connection.js';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export function databaseUrl(): string {
  return validateDatabaseUrl(process.env.DATABASE_URL);
}

export function migrationDatabaseUrl(): string {
  const value = process.env.MIGRATION_DATABASE_URL?.trim();
  return value ? validateDatabaseUrl(value, 'MIGRATION_DATABASE_URL') : databaseUrl();
}
