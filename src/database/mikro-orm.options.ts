import { UnderscoreNamingStrategy } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';

import { accommodationEntities } from '../accommodation/entities';
import { DatabaseEnvironment } from '../config/environment';

export function createMikroOrmOptions(environment: DatabaseEnvironment) {
  return defineConfig({
    allowGlobalContext: false,
    clientUrl: environment.clientUrl,
    debug: environment.debug,
    discovery: {
      warnWhenNoEntities: true,
    },
    driverOptions: environment.ssl
      ? {
          ssl: {
            rejectUnauthorized: environment.sslRejectUnauthorized,
          },
        }
      : {},
    driver: PostgreSqlDriver,
    entities: [...accommodationEntities],
    extensions: [Migrator],
    migrations: {
      allOrNothing: true,
      disableForeignKeys: false,
      dropTables: false,
      emit: 'ts',
      glob: '!(*.d).{js,ts,cjs}',
      path: 'dist/database/migrations',
      pathTs: 'src/database/migrations',
      safe: true,
      snapshot: true,
      snapshotName: '.snapshot-lodgekeeper',
      transactional: true,
    },
    namingStrategy: UnderscoreNamingStrategy,
    pool: {
      max: environment.poolMax,
      min: environment.poolMin,
    },
    preferReadReplicas: false,
    schemaGenerator: {
      ignoreRoutines: true,
      ignoreSchema: ['app'],
      ignoreTriggers: true,
    },
  });
}
