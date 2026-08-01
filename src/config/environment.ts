import { ConfigService } from '@nestjs/config';

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

const BOOLEAN_VALUES = new Map<string, boolean>([
  ['false', false],
  ['true', true],
]);

function requiredString(source: Record<string, unknown>, key: string): string {
  const value = source[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} must be a non-empty string`);
  }

  return value;
}

function booleanValue(
  source: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const raw = source[key];

  if (raw === undefined) {
    return fallback;
  }

  if (typeof raw !== 'string' && typeof raw !== 'boolean') {
    throw new Error(`${key} must be either true or false`);
  }

  const value = BOOLEAN_VALUES.get(String(raw).toLowerCase());

  if (value === undefined) {
    throw new Error(`${key} must be either true or false`);
  }

  return value;
}

function positiveInteger(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const raw = source[key];

  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }

  return value;
}

function optionalString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const raw = source[key];

  if (raw === undefined) {
    return fallback;
  }

  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${key} must be a non-empty string`);
  }

  return raw;
}

export function validateEnvironment(
  source: Record<string, unknown>,
): Record<string, unknown> {
  const databaseUrl = requiredString(source, 'DATABASE_URL');

  try {
    const parsed = new URL(databaseUrl);

    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  const poolMin = positiveInteger(source, 'DATABASE_POOL_MIN', 1);
  const poolMax = positiveInteger(source, 'DATABASE_POOL_MAX', 10);
  const sessionTtlSeconds = positiveInteger(
    source,
    'AUTH_SESSION_TTL_SECONDS',
    604_800,
  );
  const sessionCookieSecure = booleanValue(
    source,
    'AUTH_SESSION_COOKIE_SECURE',
    source.NODE_ENV === 'production',
  );
  const sessionCookieName = optionalString(
    source,
    'AUTH_SESSION_COOKIE_NAME',
    'lodgekeeper_session',
  );

  if (poolMax === 0 || poolMin > poolMax) {
    throw new Error(
      'DATABASE_POOL_MAX must be positive and no smaller than DATABASE_POOL_MIN',
    );
  }

  if (sessionTtlSeconds === 0) {
    throw new Error('AUTH_SESSION_TTL_SECONDS must be positive');
  }

  if (sessionCookieName.startsWith('__Host-') && !sessionCookieSecure) {
    throw new Error(
      'AUTH_SESSION_COOKIE_SECURE must be true for a __Host- cookie',
    );
  }

  return {
    ...source,
    DATABASE_DEBUG: booleanValue(source, 'DATABASE_DEBUG', false),
    DATABASE_POOL_MAX: poolMax,
    DATABASE_POOL_MIN: poolMin,
    DATABASE_SSL: booleanValue(source, 'DATABASE_SSL', false),
    DATABASE_SSL_REJECT_UNAUTHORIZED: booleanValue(
      source,
      'DATABASE_SSL_REJECT_UNAUTHORIZED',
      true,
    ),
    AUTH_SESSION_COOKIE_NAME: sessionCookieName,
    AUTH_SESSION_COOKIE_SECURE: sessionCookieSecure,
    AUTH_SESSION_TTL_SECONDS: sessionTtlSeconds,
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
  const values = validateEnvironment({
    ...source,
    DATABASE_URL: source[urlKey],
  });

  return {
    clientUrl: values.DATABASE_URL as string,
    debug: values.DATABASE_DEBUG as boolean,
    poolMax: values.DATABASE_POOL_MAX as number,
    poolMin: values.DATABASE_POOL_MIN as number,
    ssl: values.DATABASE_SSL as boolean,
    sslRejectUnauthorized: values.DATABASE_SSL_REJECT_UNAUTHORIZED as boolean,
  };
}
