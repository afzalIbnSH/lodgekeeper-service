import {
  DatabaseEnvironment,
  databaseEnvironmentFromProcess,
} from '../config/environment';

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

function required(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key]?.trim();

  if (!value) {
    throw new Error(`${key} must be a non-empty string`);
  }

  return value;
}

function positiveInteger(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
): number {
  const raw = source[key];
  const value = raw === undefined ? fallback : Number(raw);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return value;
}

function boolean(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean,
): boolean {
  const raw = source[key];

  if (raw === undefined) {
    return fallback;
  }

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  throw new Error(`${key} must be either true or false`);
}

export function provisioningEnvironmentFromProcess(
  source: NodeJS.ProcessEnv,
): ProvisioningEnvironment {
  const appPublicUrl = required(source, 'APP_PUBLIC_URL');
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

  const deliveryValue = source.INVITATION_DELIVERY ?? 'console';

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
    invitationTtlHours: positiveInteger(source, 'INVITATION_TTL_HOURS', 48),
    smtpPort: positiveInteger(source, 'SMTP_PORT', 587),
    smtpSecure: boolean(source, 'SMTP_SECURE', false),
  };

  if (deliveryValue === 'smtp') {
    environment.smtpFrom = required(source, 'SMTP_FROM');
    environment.smtpHost = required(source, 'SMTP_HOST');

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
