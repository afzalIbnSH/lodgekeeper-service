import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AccommodationModule } from './accommodation/accommodation.module';
import { AuthModule } from './auth/auth.module';
import { databaseEnvironment, validateEnvironment } from './config/environment';
import { createMikroOrmOptions } from './database/mikro-orm.options';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMikroOrmOptions(databaseEnvironment(config)),
    }),
    AccommodationModule,
    AuthModule,
  ],
})
export class AppModule {}
