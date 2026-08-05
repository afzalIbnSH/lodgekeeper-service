import {
  DatabaseEnvironment,
  databaseEnvironmentFromProcess,
} from '../config/database-environment';
import {
  readBoolean,
  readPositiveInteger,
  readRequiredString,
  readString,
} from '../config/environment-value';

export type InvitationDeliveryKind = 'console' | 'smtp';

export interface ProvisioningEnvironment {
  appPublicUrl: string;
  database: DatabaseEnvironment;
  delivery: InvitationDeliveryKind;
  invitationTtlHours: number;
  smtpFrom?: string;
  smtpHost?: string;
  smtpPassword?: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser?: string;
}

export function provisioningEnvironmentFromProcess(
  source: NodeJS.ProcessEnv,
): ProvisioningEnvironment {
  const appPublicUrl = readRequiredString(source, 'APP_PUBLIC_URL');
  let parsedPublicUrl: URL;

  try {
    parsedPublicUrl = new URL(appPublicUrl);
  } catch {
    throw new Error('APP_PUBLIC_URL must be a valid URL');
  }

  if (
    parsedPublicUrl.protocol !== 'http:' &&
    parsedPublicUrl.protocol !== 'https:'
  ) {
    throw new Error('APP_PUBLIC_URL must use HTTP or HTTPS');
  }

  const deliveryValue = readString(source, 'INVITATION_DELIVERY', 'console');

  if (deliveryValue !== 'console' && deliveryValue !== 'smtp') {
    throw new Error('INVITATION_DELIVERY must be either console or smtp');
  }

  const environment: ProvisioningEnvironment = {
    appPublicUrl: parsedPublicUrl.toString(),
    database: databaseEnvironmentFromProcess(
      source,
      'PROVISIONING_DATABASE_URL',
    ),
    delivery: deliveryValue,
    invitationTtlHours: readPositiveInteger(source, 'INVITATION_TTL_HOURS', 48),
    smtpPort: readPositiveInteger(source, 'SMTP_PORT', 587),
    smtpSecure: readBoolean(source, 'SMTP_SECURE', false),
  };

  if (deliveryValue === 'smtp') {
    environment.smtpFrom = readRequiredString(source, 'SMTP_FROM');
    environment.smtpHost = readRequiredString(source, 'SMTP_HOST');

    const smtpUser = source.SMTP_USER?.trim();
    const smtpPassword = source.SMTP_PASSWORD;

    if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
      throw new Error('SMTP_USER and SMTP_PASSWORD must be supplied together');
    }

    environment.smtpUser = smtpUser;
    environment.smtpPassword = smtpPassword;
  }

  return environment;
}
