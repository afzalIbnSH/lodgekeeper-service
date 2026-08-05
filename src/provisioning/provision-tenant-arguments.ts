import type { ProvisionTenantInput } from './provisioning.service';

const ARGUMENTS = new Map<string, keyof ProvisionTenantInput>([
  ['--admin-email', 'adminEmail'],
  ['--currency-code', 'currencyCode'],
  ['--property-name', 'propertyName'],
  ['--tenant-name', 'tenantName'],
  ['--timezone', 'timezone'],
]);

const USAGE =
  'Usage: npm run provision:tenant -- --tenant-name NAME --property-name NAME --currency-code INR --timezone Asia/Kolkata --admin-email EMAIL';

export function parseProvisionTenantArguments(
  values: string[],
): ProvisionTenantInput {
  const parsed: Partial<Record<keyof ProvisionTenantInput, string>> = {};

  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    const property = flag ? ARGUMENTS.get(flag) : undefined;

    if (!property || !value || value.startsWith('--')) {
      throw new Error(USAGE);
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
