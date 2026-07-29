import { defineEntity, p } from '@mikro-orm/core';

import { updatedAtTrigger } from '../../database/updated-at-trigger';

const TenantSchema = defineEntity({
  name: 'Tenant',
  tableName: 'tenants',
  checks: [
    {
      name: 'tenants_name_not_blank',
      expression: "btrim(name) <> ''",
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw('uuidv7()'),
    name: p.text(),
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
    archivedAt: p
      .datetime()
      .fieldName('archived_at')
      .columnType('timestamptz')
      .nullable(),
  },
  triggers: [updatedAtTrigger('tenants')],
});

export class Tenant extends TenantSchema.class {}
TenantSchema.setClass(Tenant);
