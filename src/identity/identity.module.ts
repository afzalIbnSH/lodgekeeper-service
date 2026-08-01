import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { identityEntities } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([...identityEntities])],
  exports: [MikroOrmModule],
})
export class IdentityModule {}
