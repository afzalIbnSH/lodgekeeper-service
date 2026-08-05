import { DynamicModule, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { TenantTransaction } from '../database/tenant-transaction';
import { createMikroOrmOptions } from '../database/mikro-orm.options';
import { InvitationMailer } from './invitation-mailer';
import { PROVISIONING_ENVIRONMENT } from './provisioning.constants';
import { ProvisioningEnvironment } from './provisioning.config';
import { ProvisioningService } from './provisioning.service';

@Module({})
export class ProvisioningModule {
  static register(environment: ProvisioningEnvironment): DynamicModule {
    return {
      module: ProvisioningModule,
      imports: [
        MikroOrmModule.forRoot(createMikroOrmOptions(environment.database)),
      ],
      providers: [
        {
          provide: PROVISIONING_ENVIRONMENT,
          useValue: environment,
        },
        InvitationMailer,
        ProvisioningService,
        TenantTransaction,
      ],
      exports: [InvitationMailer, ProvisioningService],
    };
  }
}
