import 'dotenv/config';

import { databaseEnvironmentFromProcess } from './src/config/database-environment';
import { createMikroOrmOptions } from './src/database/mikro-orm.options';

export default createMikroOrmOptions(
  databaseEnvironmentFromProcess(process.env, 'MIGRATION_DATABASE_URL'),
);
