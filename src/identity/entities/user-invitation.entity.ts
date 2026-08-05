import { defineEntity, p } from '@mikro-orm/core';

import { Tenant } from '../../accommodation/entities/tenant.entity';
import { User } from './user.entity';

const UserInvitationSchema = defineEntity({
  name: 'UserInvitation',
  tableName: 'user_invitations',
  checks: [
    {
      name: 'user_invitations_token_hash_format',
      expression: "token_hash ~ '^[0-9a-f]{64}$'",
    },
    {
      name: 'user_invitations_expiry_valid',
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
        .foreignKeyName('user_invitations_user_fk')
        .deleteRule('cascade'),
    tokenHash: p.string().fieldName('token_hash').length(64).hidden(),
    expiresAt: p.datetime().fieldName('expires_at').columnType('timestamptz'),
    acceptedAt: p
      .datetime()
      .fieldName('accepted_at')
      .columnType('timestamptz')
      .nullable(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
  },
  uniques: [
    {
      name: 'user_invitations_tenant_token_unique',
      properties: ['tenant', 'tokenHash'],
    },
    // TODO(invitation-reissue): Add a revoke/reissue workflow for expired or
    // lost invitations before supporting replacement invitations.
    {
      name: 'user_invitations_active_user_unique',
      expression:
        'create unique index user_invitations_active_user_unique on user_invitations (tenant_id, user_id) where accepted_at is null',
    },
  ],
});

export class UserInvitation extends UserInvitationSchema.class {}
UserInvitationSchema.setClass(UserInvitation);
