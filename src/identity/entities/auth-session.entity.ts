import { defineEntity, p } from '@mikro-orm/core';

import { Tenant } from '../../accommodation/entities/tenant.entity';
import { User } from './user.entity';

const AuthSessionSchema = defineEntity({
  name: 'AuthSession',
  tableName: 'auth_sessions',
  checks: [
    {
      name: 'auth_sessions_token_hash_format',
      expression: "token_hash ~ '^[0-9a-f]{64}$'",
    },
    {
      name: 'auth_sessions_expiry_valid',
      expression: 'expires_at > created_at',
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw('uuidv7()'),
    tenant: () =>
      p
        .manyToOne(Tenant)
        .fieldName('tenant_id')
        .createForeignKeyConstraint(false),
    user: () =>
      p
        .manyToOne(User)
        .joinColumns('tenant_id', 'user_id')
        .referencedColumnNames('tenant_id', 'id')
        .foreignKeyName('auth_sessions_user_fk')
        .deleteRule('cascade'),
    tokenHash: p.string().fieldName('token_hash').length(64).hidden(),
    expiresAt: p.datetime().fieldName('expires_at').columnType('timestamptz'),
    lastSeenAt: p
      .datetime()
      .fieldName('last_seen_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
    revokedAt: p
      .datetime()
      .fieldName('revoked_at')
      .columnType('timestamptz')
      .nullable(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
  },
  indexes: [
    {
      name: 'auth_sessions_user_expiry_lookup',
      properties: ['tenant', 'user', 'expiresAt'],
    },
  ],
  uniques: [
    {
      name: 'auth_sessions_tenant_token_unique',
      properties: ['tenant', 'tokenHash'],
    },
  ],
});

export class AuthSession extends AuthSessionSchema.class {}
AuthSessionSchema.setClass(AuthSession);
