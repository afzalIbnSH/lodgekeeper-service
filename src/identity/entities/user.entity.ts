import { defineEntity, p } from '@mikro-orm/core';

import { Tenant } from '../../accommodation/entities/tenant.entity';
import { updatedAtTrigger } from '../../database/updated-at-trigger';

export enum UserRole {
  TENANT_ADMIN = 'tenant_admin',
}

export enum UserStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

const UserSchema = defineEntity({
  name: 'User',
  tableName: 'users',
  checks: [
    {
      name: 'users_email_normalized',
      expression:
        "email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'",
    },
    {
      name: 'users_display_name_not_blank',
      expression: "display_name is null or btrim(display_name) <> ''",
    },
    {
      name: 'users_status_shape_valid',
      expression: `
        (
          status = 'invited'
          and password_hash is null
          and activated_at is null
          and suspended_at is null
        )
        or
        (
          status = 'active'
          and display_name is not null
          and password_hash is not null
          and activated_at is not null
          and suspended_at is null
        )
        or
        (
          status = 'suspended'
          and display_name is not null
          and password_hash is not null
          and activated_at is not null
          and suspended_at is not null
        )
      `,
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw('uuidv7()'),
    tenant: () =>
      p
        .manyToOne(Tenant)
        .fieldName('tenant_id')
        .foreignKeyName('users_tenant_id_foreign')
        .deleteRule('restrict'),
    email: p.text(),
    displayName: p.text().fieldName('display_name').nullable(),
    passwordHash: p.text().fieldName('password_hash').nullable().hidden(),
    role: p.enum(() => UserRole).default(UserRole.TENANT_ADMIN),
    status: p.enum(() => UserStatus).default(UserStatus.INVITED),
    emailVerifiedAt: p
      .datetime()
      .fieldName('email_verified_at')
      .columnType('timestamptz')
      .nullable(),
    activatedAt: p
      .datetime()
      .fieldName('activated_at')
      .columnType('timestamptz')
      .nullable(),
    suspendedAt: p
      .datetime()
      .fieldName('suspended_at')
      .columnType('timestamptz')
      .nullable(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
    updatedAt: p
      .datetime()
      .fieldName('updated_at')
      .columnType('timestamptz')
      .defaultRaw('now()')
      .onUpdate(() => new Date()),
  },
  uniques: [
    {
      name: 'users_tenant_id_id_unique',
      properties: ['tenant', 'id'],
    },
    {
      name: 'users_email_unique',
      properties: ['email'],
    },
  ],
  triggers: [updatedAtTrigger('users')],
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
