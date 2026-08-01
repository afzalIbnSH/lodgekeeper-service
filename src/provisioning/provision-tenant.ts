import 'dotenv/config';
import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { InvitationMailer } from './invitation-mailer';
import { provisioningEnvironmentFromProcess } from './provisioning.config';
import { ProvisioningModule } from './provisioning.module';
import {
  ProvisionTenantInput,
  ProvisioningService,
} from './provisioning.service';

const ARGUMENTS = new Map<string, keyof ProvisionTenantInput>([
  ['--admin-email', 'adminEmail'],
  ['--currency-code', 'currencyCode'],
  ['--property-name', 'propertyName'],
  ['--tenant-name', 'tenantName'],
  ['--timezone', 'timezone'],
]);

function parseArguments(values: string[]): ProvisionTenantInput {
  const parsed: Partial<Record<keyof ProvisionTenantInput, string>> = {};

  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    const property = flag ? ARGUMENTS.get(flag) : undefined;

    if (!property || !value || value.startsWith('--')) {
      throw new Error(
        'Usage: npm run provision:tenant -- --tenant-name NAME --property-name NAME --currency-code INR --timezone Asia/Kolkata --admin-email EMAIL',
      );
    }

    parsed[property] = value;
  }

  const required = [
    'adminEmail',
    'currencyCode',
    'propertyName',
    'tenantName',
    'timezone',
  ] as const;

  if (required.some((property) => !parsed[property]?.trim())) {
    throw new Error('Every provisioning argument is required');
  }

  if (!/^[A-Z]{3}$/i.test(parsed.currencyCode!)) {
    throw new Error('--currency-code must be a three-letter ISO 4217 code');
  }

  if (!/^\S+@\S+\.\S+$/.test(parsed.adminEmail!)) {
    throw new Error('--admin-email must be a valid email address');
  }

  try {
    new Intl.DateTimeFormat('en', { timeZone: parsed.timezone }).format();
  } catch {
    throw new Error('--timezone must be a valid IANA time-zone name');
  }

  return parsed as ProvisionTenantInput;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('TenantProvisioning');
  const input = parseArguments(process.argv.slice(2));
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
