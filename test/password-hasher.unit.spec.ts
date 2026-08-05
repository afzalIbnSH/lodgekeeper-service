import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { PasswordHasher } from '../src/auth/password-hasher';

const PASSWORD = 'correct horse battery staple';

void describe('PasswordHasher', () => {
  const passwordHasher = new PasswordHasher();
  let encodedHash = '';

  before(async () => {
    encodedHash = await passwordHasher.hash(PASSWORD);
  });

  void it('stores the scrypt parameters, salt and derived key', () => {
    const [algorithm, cost, blockSize, parallelization, salt, derivedKey] =
      encodedHash.split('$');

    assert.equal(algorithm, 'scrypt');
    assert.equal(cost, '131072');
    assert.equal(blockSize, '8');
    assert.equal(parallelization, '1');
    assert.match(salt, /^[A-Za-z0-9_-]{22}$/);
    assert.match(derivedKey, /^[A-Za-z0-9_-]{86}$/);
  });

  void it('accepts the correct password and rejects an incorrect one', async () => {
    assert.equal(await passwordHasher.verify(PASSWORD, encodedHash), true);
    assert.equal(
      await passwordHasher.verify('this is not the password', encodedHash),
      false,
    );
  });

  void it('rejects malformed hashes and unsafe scrypt parameters', async () => {
    const [, cost, blockSize, parallelization, salt, derivedKey] =
      encodedHash.split('$');
    const malformed = [
      '',
      `argon2$${cost}$${blockSize}$${parallelization}$${salt}$${derivedKey}`,
      `scrypt$not-a-number$${blockSize}$${parallelization}$${salt}$${derivedKey}`,
      `scrypt$${Number(cost) + 1}$${blockSize}$${parallelization}$${salt}$${derivedKey}`,
      `scrypt$${cost}$${Number(blockSize) + 1}$${parallelization}$${salt}$${derivedKey}`,
      `scrypt$${cost}$${blockSize}$${Number(parallelization) + 1}$${salt}$${derivedKey}`,
      `scrypt$${cost}$${blockSize}$${parallelization}$short$${derivedKey}`,
      `scrypt$${cost}$${blockSize}$${parallelization}$${salt}$short`,
    ];

    for (const candidate of malformed) {
      assert.equal(await passwordHasher.verify(PASSWORD, candidate), false);
    }
  });

  void it('can perform dummy password work for an unknown user', async () => {
    await assert.doesNotReject(
      passwordHasher.consumeEquivalentWork('unknown user password'),
    );
  });
});
