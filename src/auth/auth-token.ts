import { createHash, randomBytes } from 'node:crypto';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createOpaqueSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(tenantId: string): string {
  return `${tenantId}.${createOpaqueSecret()}`;
}

export function tenantIdFromSessionToken(token: string): string | undefined {
  const separator = token.indexOf('.');

  if (separator === -1 || token.indexOf('.', separator + 1) !== -1) {
    return undefined;
  }

  const tenantId = token.slice(0, separator);
  const secret = token.slice(separator + 1);

  if (!UUID_PATTERN.test(tenantId) || !TOKEN_SECRET_PATTERN.test(secret)) {
    return undefined;
  }

  return tenantId;
}
