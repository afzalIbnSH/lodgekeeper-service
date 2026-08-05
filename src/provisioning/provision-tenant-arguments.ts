import type { ProvisionTenantInput } from './provisioning.service';

const ARGUMENTS: ReadonlyArray<{
  flag: string;
  property: keyof ProvisionTenantInput;
}> = [
  { flag: '--admin-email', property: 'adminEmail' },
  { flag: '--currency-code', property: 'currencyCode' },
  { flag: '--property-name', property: 'propertyName' },
  { flag: '--tenant-name', property: 'tenantName' },
  { flag: '--timezone', property: 'timezone' },
];

const ARGUMENT_BY_FLAG = new Map(
  ARGUMENTS.map(({ flag, property }) => [flag, property]),
);

export function parseProvisionTenantArguments(
  values: string[],
): ProvisionTenantInput {
  const parsed: Partial<Record<keyof ProvisionTenantInput, string>> = {};

  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    const property = flag ? ARGUMENT_BY_FLAG.get(flag) : undefined;

    if (!property) {
      throw new Error(`Unknown provisioning argument: ${flag || '(blank)'}`);
    }

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`);
    }

    if (value.trim() === '') {
      throw new Error(`${flag} must not be blank`);
    }

    parsed[property] = value;
  }

  const missing = ARGUMENTS.filter(
    ({ property }) => parsed[property] === undefined,
  ).map(({ flag }) => flag);

  if (missing.length > 0) {
    const label = missing.length === 1 ? 'argument' : 'arguments';

    throw new Error(`Missing required ${label}: ${missing.join(', ')}`);
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
