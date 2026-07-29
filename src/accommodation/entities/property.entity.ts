import { defineEntity, p } from '@mikro-orm/core';

import { updatedAtTrigger } from '../../database/updated-at-trigger';
import { Tenant } from './tenant.entity';

const PropertySchema = defineEntity({
  name: 'Property',
  tableName: 'properties',
  checks: [
    {
      name: 'properties_name_not_blank',
      expression: "btrim(name) <> ''",
    },
    {
      name: 'properties_currency_code_format',
      expression: "currency_code ~ '^[A-Z]{3}$'",
    },
    {
      name: 'properties_timezone_not_blank',
      expression: "btrim(timezone) <> ''",
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw('uuidv7()'),
    tenant: () =>
      p
        .manyToOne(Tenant)
        .fieldName('tenant_id')
        .foreignKeyName('properties_tenant_id_foreign')
        .deleteRule('restrict'),
    name: p.text(),
    currencyCode: p.string().fieldName('currency_code').length(3),
    timezone: p.text(),
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
  uniques: [
    {
      name: 'properties_tenant_id_id_unique',
      properties: ['tenant', 'id'],
    },
    {
      name: 'properties_active_name_unique',
      expression:
        'create unique index properties_active_name_unique on properties (tenant_id, lower(btrim(name))) where archived_at is null',
    },
  ],
  triggers: [updatedAtTrigger('properties')],
});

export class Property extends PropertySchema.class {}
PropertySchema.setClass(Property);
