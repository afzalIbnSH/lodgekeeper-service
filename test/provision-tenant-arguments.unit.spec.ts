import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseProvisionTenantArguments } from '../src/provisioning/provision-tenant-arguments';

const VALID_ARGUMENTS = [
  '--tenant-name',
  'Abhilash Tourist Home',
  '--property-name',
  'Abhilash Tourist Home',
  '--currency-code',
  'INR',
  '--timezone',
  'Asia/Kolkata',
  '--admin-email',
  'admin@example.com',
];

function withArgument(flag: string, value: string): string[] {
  const values = [...VALID_ARGUMENTS];
  const index = values.indexOf(flag);

  assert.notEqual(index, -1);
  values[index + 1] = value;
  return values;
}

void describe('tenant provisioning arguments', () => {
  void it('maps valid named arguments to provisioning input', () => {
    assert.deepEqual(parseProvisionTenantArguments(VALID_ARGUMENTS), {
      adminEmail: 'admin@example.com',
      currencyCode: 'INR',
      propertyName: 'Abhilash Tourist Home',
      tenantName: 'Abhilash Tourist Home',
      timezone: 'Asia/Kolkata',
    });
  });

  void it('rejects unknown flags and missing values with usage guidance', () => {
    assert.throws(
      () =>
        parseProvisionTenantArguments([
          '--unknown',
          'value',
          ...VALID_ARGUMENTS,
        ]),
      /Usage: npm run provision:tenant/,
    );
    assert.throws(
      () => parseProvisionTenantArguments(VALID_ARGUMENTS.slice(0, -1)),
      /Usage: npm run provision:tenant/,
    );
  });

  void it('requires every argument to contain a non-blank value', () => {
    assert.throws(
      () => parseProvisionTenantArguments(withArgument('--property-name', ' ')),
      /Every provisioning argument is required/,
    );
  });

  void it('validates currency, email and time-zone formats', () => {
    assert.throws(
      () => parseProvisionTenantArguments(withArgument('--currency-code', '₹')),
      /three-letter ISO 4217 code/,
    );
    assert.throws(
      () =>
        parseProvisionTenantArguments(
          withArgument('--admin-email', 'not-an-email'),
        ),
      /valid email address/,
    );
    assert.throws(
      () =>
        parseProvisionTenantArguments(
          withArgument('--timezone', 'Mars/Olympus'),
        ),
      /valid IANA time-zone name/,
    );
  });
});
