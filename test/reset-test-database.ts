import { MikroORM } from '@mikro-orm/postgresql';

import { assertSafeTestDatabaseUrls } from './test-database-safety';

export async function resetTestDatabase(
  orm: MikroORM,
  migrationDatabaseUrl: string,
): Promise<void> {
  assertSafeTestDatabaseUrls(migrationDatabaseUrl, migrationDatabaseUrl);

  const entityManager = orm.em.fork();
  const expectedDatabaseName = decodeURIComponent(
    new URL(migrationDatabaseUrl).pathname.replace(/^\//, ''),
  );
  const [database] = await entityManager.execute<
    Array<{ database_name: string }>
  >('select current_database() as database_name');

  if (database?.database_name !== expectedDatabaseName) {
    throw new Error(
      `Refusing to reset database "${database?.database_name ?? 'unknown'}"; expected "${expectedDatabaseName}"`,
    );
  }

  await entityManager.execute('drop schema if exists app cascade');
  await entityManager.execute('drop schema if exists public cascade');
  await entityManager.execute('create schema public');
}
