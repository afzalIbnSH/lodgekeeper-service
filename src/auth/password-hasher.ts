import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_COST = 131_072;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY = 256 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelization: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: cost,
        maxmem: SCRYPT_MAX_MEMORY,
        p: parallelization,
        r: blockSize,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const derivedKey = await deriveKey(
      password,
      salt,
      SCRYPT_COST,
      SCRYPT_BLOCK_SIZE,
      SCRYPT_PARALLELIZATION,
    );

    return [
      'scrypt',
      SCRYPT_COST,
      SCRYPT_BLOCK_SIZE,
      SCRYPT_PARALLELIZATION,
      salt.toString('base64url'),
      derivedKey.toString('base64url'),
    ].join('$');
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const parts = encodedHash.split('$');

    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }

    const [, costValue, blockSizeValue, parallelizationValue, saltValue, hash] =
      parts;
    const cost = Number(costValue);
    const blockSize = Number(blockSizeValue);
    const parallelization = Number(parallelizationValue);

    if (
      !Number.isSafeInteger(cost) ||
      !Number.isSafeInteger(blockSize) ||
      !Number.isSafeInteger(parallelization) ||
      cost < 2 ||
      cost > SCRYPT_COST ||
      blockSize < 1 ||
      blockSize > SCRYPT_BLOCK_SIZE ||
      parallelization < 1 ||
      parallelization > SCRYPT_PARALLELIZATION
    ) {
      return false;
    }

    try {
      const salt = Buffer.from(saltValue, 'base64url');
      const expected = Buffer.from(hash, 'base64url');

      if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) {
        return false;
      }

      const actual = await deriveKey(
        password,
        salt,
        cost,
        blockSize,
        parallelization,
      );

      return timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  async consumeEquivalentWork(password: string): Promise<void> {
    await deriveKey(
      password,
      Buffer.alloc(SALT_LENGTH),
      SCRYPT_COST,
      SCRYPT_BLOCK_SIZE,
      SCRYPT_PARALLELIZATION,
    );
  }
}
