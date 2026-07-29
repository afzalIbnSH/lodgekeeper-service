import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TenantTransaction } from '../database/tenant-transaction';
import { accommodationEntities } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([...accommodationEntities])],
  providers: [TenantTransaction],
  exports: [MikroOrmModule, TenantTransaction],
})
export class AccommodationModule {}
