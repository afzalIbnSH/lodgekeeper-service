import 'dotenv/config';
import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { InvitationMailer } from './invitation-mailer';
import { parseProvisionTenantArguments } from './provision-tenant-arguments';
import { provisioningEnvironmentFromProcess } from './provisioning.config';
import { ProvisioningModule } from './provisioning.module';
import { ProvisioningService } from './provisioning.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('TenantProvisioning');
  const input = parseProvisionTenantArguments(process.argv.slice(2));
  const environment = provisioningEnvironmentFromProcess(process.env);
  const application = await NestFactory.createApplicationContext(
    ProvisioningModule.register(environment),
  );

  try {
    const provisioner = application.get(ProvisioningService);
    const mailer = application.get(InvitationMailer);
    const result = await provisioner.provisionTenant(input);
    const invitationMessage = {
      email: result.adminEmail,
      tenantId: result.tenantId,
      tenantName: result.tenantName,
      token: result.invitationToken,
    };

    logger.log(
      `Provisioned tenant ${result.tenantId}, property ${result.propertyId}, and invitation ${result.invitationId}`,
    );

    try {
      await mailer.send(invitationMessage);
    } catch (error) {
      logger.error(
        `Provisioning committed, but invitation delivery failed. Deliver this link manually: ${mailer.activationUrl(invitationMessage).toString()}`,
      );
      throw error;
    }
  } finally {
    await application.close();
  }
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  new Logger('TenantProvisioning').error(message);
  process.exitCode = 1;
});
