const TEST_DATABASE_NAME_PATTERN = /(^|[-_])test($|[-_])/i;

interface DatabaseTarget {
  databaseName: string;
  hostname: string;
  port: string;
}

function databaseTarget(variableName: string, value: string): DatabaseTarget {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `${variableName} must target a database with "test" as a distinct name segment; received "${databaseName}"`,
    );
  }

  return {
    databaseName,
    hostname: url.hostname.toLowerCase(),
    port: url.port || '5432',
  };
}

export function assertSafeTestDatabaseUrls(
  applicationUrl: string,
  migrationUrl: string,
): void {
  const application = databaseTarget('DATABASE_URL', applicationUrl);
  const migration = databaseTarget('MIGRATION_DATABASE_URL', migrationUrl);

  if (
    application.hostname !== migration.hostname ||
    application.port !== migration.port ||
    application.databaseName !== migration.databaseName
  ) {
    throw new Error(
      'DATABASE_URL and MIGRATION_DATABASE_URL must target the same test database host, port and name',
    );
  }
}
