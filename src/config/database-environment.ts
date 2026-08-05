import { ConfigService } from '@nestjs/config';

import {
  EnvironmentSource,
  readBoolean,
  readNonNegativeInteger,
  readPositiveInteger,
  readRequiredString,
} from './environment-value';

export interface DatabaseEnvironment {
  clientUrl: string;
  debug: boolean;
  poolMax: number;
  poolMin: number;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
}

export type DatabaseUrlKey =
  'DATABASE_URL' | 'MIGRATION_DATABASE_URL' | 'PROVISIONING_DATABASE_URL';

function readPostgreSqlUrl(
  source: EnvironmentSource,
  key: DatabaseUrlKey,
): string {
  const value = readRequiredString(source, key);

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error(`${key} must be a valid PostgreSQL connection URL`);
  }

  return value;
}

export function databaseEnvironmentFromSource(
  source: EnvironmentSource,
  urlKey: DatabaseUrlKey,
): DatabaseEnvironment {
  const poolMin = readNonNegativeInteger(source, 'DATABASE_POOL_MIN', 1);
  const poolMax = readPositiveInteger(source, 'DATABASE_POOL_MAX', 10);

  if (poolMin > poolMax) {
    throw new Error(
      'DATABASE_POOL_MAX must be no smaller than DATABASE_POOL_MIN',
    );
  }

  return {
    clientUrl: readPostgreSqlUrl(source, urlKey),
    debug: readBoolean(source, 'DATABASE_DEBUG', false),
    poolMax,
    poolMin,
    ssl: readBoolean(source, 'DATABASE_SSL', false),
    sslRejectUnauthorized: readBoolean(
      source,
      'DATABASE_SSL_REJECT_UNAUTHORIZED',
      true,
    ),
  };
}

export function databaseEnvironment(
  config: ConfigService,
): DatabaseEnvironment {
  return {
    clientUrl: config.getOrThrow<string>('DATABASE_URL'),
    debug: config.getOrThrow<boolean>('DATABASE_DEBUG'),
    poolMax: config.getOrThrow<number>('DATABASE_POOL_MAX'),
    poolMin: config.getOrThrow<number>('DATABASE_POOL_MIN'),
    ssl: config.getOrThrow<boolean>('DATABASE_SSL'),
    sslRejectUnauthorized: config.getOrThrow<boolean>(
      'DATABASE_SSL_REJECT_UNAUTHORIZED',
    ),
  };
}

export function databaseEnvironmentFromProcess(
  source: NodeJS.ProcessEnv,
  urlKey: DatabaseUrlKey,
): DatabaseEnvironment {
  return databaseEnvironmentFromSource(source, urlKey);
}
