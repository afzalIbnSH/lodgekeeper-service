import { randomUUID } from 'node:crypto';

import { EntityManager } from '@mikro-orm/postgresql';
import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { Property as LodgingProperty } from '../accommodation/entities/property.entity';
import { Tenant } from '../accommodation/entities/tenant.entity';
import { createOpaqueSecret, hashOpaqueToken } from '../auth/auth-token';
import { TenantTransaction } from '../database/tenant-transaction';
import { UserInvitation } from '../identity/entities/user-invitation.entity';
import { User, UserRole, UserStatus } from '../identity/entities/user.entity';
import {
  PROVISIONER_DATABASE_ROLE,
  PROVISIONING_ENVIRONMENT,
} from './provisioning.constants';
import type { ProvisioningEnvironment } from './provisioning.config';

export interface ProvisionTenantInput {
  adminEmail: string;
  currencyCode: string;
  propertyName: string;
  tenantName: string;
  timezone: string;
}

export interface ProvisionedTenant {
  adminEmail: string;
  invitationId: string;
  invitationToken: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
}

@Injectable()
export class ProvisioningService {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    @Inject(TenantTransaction)
    private readonly tenantTransaction: TenantTransaction,
    @Inject(PROVISIONING_ENVIRONMENT)
    private readonly environment: ProvisioningEnvironment,
  ) {}

  async provisionTenant(
    input: ProvisionTenantInput,
  ): Promise<ProvisionedTenant> {
    await this.assertProvisionerRole();

    const tenantId = randomUUID();
    const propertyId = randomUUID();
    const adminEmail = input.adminEmail.trim().toLowerCase();
    const invitationToken = createOpaqueSecret();

    return this.tenantTransaction.run(tenantId, async (transaction) => {
      const existingUser = await transaction.findOne(User, {
        email: adminEmail,
      });

      if (existingUser) {
        throw new ConflictException(
          'A user with this email already exists; inviting existing users is not implemented yet',
        );
      }

      const tenant = transaction.create(Tenant, {
        id: tenantId,
        name: input.tenantName.trim(),
      });
      const property = transaction.create(LodgingProperty, {
        currencyCode: input.currencyCode.trim().toUpperCase(),
        id: propertyId,
        name: input.propertyName.trim(),
        tenant,
        timezone: input.timezone.trim(),
      });
      const user = transaction.create(User, {
        email: adminEmail,
        role: UserRole.TENANT_ADMIN,
        status: UserStatus.INVITED,
        tenant,
      });
      const invitation = transaction.create(UserInvitation, {
        expiresAt: new Date(
          Date.now() + this.environment.invitationTtlHours * 60 * 60 * 1_000,
        ),
        tenant,
        tokenHash: hashOpaqueToken(invitationToken),
        user,
      });

      transaction.persist([tenant, property, user, invitation]);
      await transaction.flush();

      return {
        adminEmail,
        invitationId: invitation.id,
        invitationToken,
        propertyId,
        tenantId,
        tenantName: tenant.name,
      };
    });
  }

  private async assertProvisionerRole(): Promise<void> {
    const [row] = await this.entityManager
      .fork()
      .execute<Array<{ current_user: string }>>('select current_user');

    if (row?.current_user !== PROVISIONER_DATABASE_ROLE) {
      throw new Error(
        `Provisioning must connect as ${PROVISIONER_DATABASE_ROLE}; connected as ${row?.current_user ?? 'unknown'}`,
      );
    }
  }
}
