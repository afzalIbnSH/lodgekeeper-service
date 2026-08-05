import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createOpaqueSecret,
  createSessionToken,
  hashOpaqueToken,
  tenantIdFromSessionToken,
} from '../src/auth/auth-token';

const TENANT_ID = '123e4567-e89b-42d3-a456-426614174000';

void describe('opaque authentication tokens', () => {
  void it('creates a 256-bit base64url secret', () => {
    assert.match(createOpaqueSecret(), /^[A-Za-z0-9_-]{43}$/);
  });

  void it('hashes tokens deterministically with SHA-256', () => {
    assert.equal(
      hashOpaqueToken('lodgekeeper-token'),
      '3dcdf955f360dd11bac8011b0ba48331eb63699c34eae3f339c79bb04c053bf3',
    );
  });

  void it('round-trips the tenant identifier in a session token', () => {
    const token = createSessionToken(TENANT_ID);

    assert.equal(tenantIdFromSessionToken(token), TENANT_ID);
    assert.match(token, new RegExp(`^${TENANT_ID}\\.[A-Za-z0-9_-]{43}$`));
  });

  void it('rejects malformed session tokens', () => {
    const secret = 'a'.repeat(43);
    const malformed = [
      '',
      TENANT_ID,
      `${TENANT_ID}.${secret}.extra`,
      `not-a-uuid.${secret}`,
      `${TENANT_ID}.${'a'.repeat(42)}`,
      `${TENANT_ID}.${'a'.repeat(44)}`,
      `${TENANT_ID}.${'a'.repeat(42)}+`,
    ];

    for (const token of malformed) {
      assert.equal(tenantIdFromSessionToken(token), undefined);
    }
  });
});
