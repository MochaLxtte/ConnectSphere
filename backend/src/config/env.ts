import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export interface Environment {
  databaseUrl: string;
  apiPort: number;
  apiHost: string;
  nodeEnv: 'development' | 'test' | 'production';
}

/** The source and compiled files both live two directories below backend/. */
export function loadEnvironment(): Environment {
  dotenv.config({
    path: fileURLToPath(new URL('../../../.env', import.meta.url)),
    quiet: true,
  });
  return parseEnvironment(process.env);
}

export function parseEnvironment(values: NodeJS.ProcessEnv): Environment {
  const databaseUrl = values.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.',
    );
  }

  const rawPort = values.API_PORT ?? '3000';
  const apiPort = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }

  const nodeEnv = values.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const apiHost = values.API_HOST?.trim() || '127.0.0.1';
  return { databaseUrl, apiPort, apiHost, nodeEnv };
}
