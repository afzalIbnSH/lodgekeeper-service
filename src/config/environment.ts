import { databaseEnvironmentFromSource } from './database-environment';
import {
  readBoolean,
  readPositiveInteger,
  readString,
} from './environment-value';

export function validateEnvironment(
  source: Record<string, unknown>,
): Record<string, unknown> {
  const database = databaseEnvironmentFromSource(source, 'DATABASE_URL');
  const sessionTtlSeconds = readPositiveInteger(
    source,
    'AUTH_SESSION_TTL_SECONDS',
    604_800,
  );
  const sessionCookieSecure = readBoolean(
    source,
    'AUTH_SESSION_COOKIE_SECURE',
    source.NODE_ENV === 'production',
  );
  const sessionCookieName = readString(
    source,
    'AUTH_SESSION_COOKIE_NAME',
    'lodgekeeper_session',
  );

  if (sessionCookieName.startsWith('__Host-') && !sessionCookieSecure) {
    throw new Error(
      'AUTH_SESSION_COOKIE_SECURE must be true for a __Host- cookie',
    );
  }

  return {
    ...source,
    DATABASE_URL: database.clientUrl,
    DATABASE_DEBUG: database.debug,
    DATABASE_POOL_MAX: database.poolMax,
    DATABASE_POOL_MIN: database.poolMin,
    DATABASE_SSL: database.ssl,
    DATABASE_SSL_REJECT_UNAUTHORIZED: database.sslRejectUnauthorized,
    AUTH_SESSION_COOKIE_NAME: sessionCookieName,
    AUTH_SESSION_COOKIE_SECURE: sessionCookieSecure,
    AUTH_SESSION_TTL_SECONDS: sessionTtlSeconds,
  };
}
